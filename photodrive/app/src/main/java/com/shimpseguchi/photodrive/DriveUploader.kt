package com.shimpseguchi.photodrive

import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * アップロードの流れ：
 *  1. ログインした Google アカウントのトークンで、Drive に「この名前・大きさのファイルを
 *     このフォルダへ置きたい」と頼むと、再開可能アップロード用の受付 URL が返ってくる
 *  2. その URL へ 8MB ずつ PUT する。途中で切れても続きから送れる
 */
object DriveUploader {
    /** 8MB（Drive の決まりで 256KB の倍数にする）。 */
    private const val PART = 32 * 256 * 1024

    /** テストでにせのサーバーに向けるため差し替えられるようにしておく。 */
    internal var apiBase = "https://www.googleapis.com"

    class ServerException(message: String) : IOException(message)
    /** トークンの期限切れ・取り消し。新しいトークンでやり直せばよい。 */
    class AuthException : IOException("認証が切れました")
    /** 受付 URL の期限切れなど。最初からやり直せばよい。 */
    class SessionGone : IOException("upload session expired")

    private fun open(url: String, token: String, method: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 30_000
            readTimeout = 60_000
            requestMethod = method
            setRequestProperty("Authorization", "Bearer $token")
        }

    /** エラー応答を、画面に出せる短い説明にする。 */
    private fun fail(conn: HttpURLConnection, code: Int): Nothing {
        if (code == 401) throw AuthException()
        val text = conn.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
        val message = runCatching { JSONObject(text).getJSONObject("error").getString("message") }.getOrNull()
        throw ServerException(
            when (code) {
                404 -> "フォルダが見つかりません（ID とアクセス権を確認）"
                403 -> "権限がありません：${message ?: "HTTP 403"}"
                else -> message ?: "HTTP $code"
            }
        )
    }

    /** 接続テスト。フォルダの名前を返す（フォルダでなければエラー）。 */
    fun folderName(token: String, folderId: String): String {
        val conn = open(
            "$apiBase/drive/v3/files/${URLEncoder.encode(folderId, "UTF-8")}" +
                "?fields=name,mimeType&supportsAllDrives=true",
            token, "GET"
        )
        try {
            val code = conn.responseCode
            if (code != 200) fail(conn, code)
            val json = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
            if (json.optString("mimeType") != "application/vnd.google-apps.folder") {
                throw ServerException("フォルダではありません")
            }
            return json.getString("name")
        } finally {
            conn.disconnect()
        }
    }

    /** 受付 URL をもらう。 */
    fun startSession(token: String, folderId: String, name: String, mimeType: String, size: Long): String {
        val conn = open("$apiBase/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true", token, "POST")
        try {
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conn.setRequestProperty("X-Upload-Content-Type", mimeType)
            conn.setRequestProperty("X-Upload-Content-Length", size.toString())
            val body = JSONObject().put("name", name).put("parents", JSONArray().put(folderId))
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
            val code = conn.responseCode
            if (code != 200) fail(conn, code)
            return conn.getHeaderField("Location") ?: throw ServerException("受付 URL がありません")
        } finally {
            conn.disconnect()
        }
    }

    /**
     * 受付 URL へ送る。すでに一部送ってあれば続きから。
     * @return true = 送信完了
     */
    fun upload(sessionUrl: String, reader: SecureStore.Reader, keepGoing: () -> Boolean): Boolean =
        upload(sessionUrl, reader.length, reader::read, keepGoing)

    /** @param read 平文の (位置, 長さ) を読み出す */
    fun upload(sessionUrl: String, total: Long, read: (Long, Int) -> ByteArray, keepGoing: () -> Boolean): Boolean {
        var offset = queryOffset(sessionUrl, total) ?: return true
        while (offset < total) {
            if (!keepGoing()) return false
            val n = minOf(PART.toLong(), total - offset).toInt()
            val part = read(offset, n)
            val conn = URL(sessionUrl).openConnection() as HttpURLConnection
            try {
                conn.connectTimeout = 30_000
                conn.readTimeout = 120_000
                conn.requestMethod = "PUT"
                conn.doOutput = true
                conn.setFixedLengthStreamingMode(n)
                conn.setRequestProperty("Content-Range", "bytes $offset-${offset + n - 1}/$total")
                conn.outputStream.use { it.write(part) }
                when (val code = conn.responseCode) {
                    200, 201 -> return true
                    308 -> offset = nextOffset(conn)
                    404, 410 -> throw SessionGone()
                    else -> throw IOException("HTTP $code")
                }
            } finally {
                part.fill(0)
                conn.disconnect()
            }
        }
        // 最後まで送ったのに完了と言われない場合は状態を聞き直す
        return queryOffset(sessionUrl, total) == null
    }

    /** サーバーが受け取り済みの位置。完了済みなら null。 */
    private fun queryOffset(sessionUrl: String, total: Long): Long? {
        val conn = URL(sessionUrl).openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 30_000
            conn.readTimeout = 60_000
            conn.requestMethod = "PUT"
            conn.doOutput = true
            conn.setFixedLengthStreamingMode(0)
            conn.setRequestProperty("Content-Range", "bytes */$total")
            conn.outputStream.close()
            return when (val code = conn.responseCode) {
                200, 201 -> null
                308 -> nextOffset(conn)
                404, 410 -> throw SessionGone()
                else -> throw IOException("HTTP $code")
            }
        } finally {
            conn.disconnect()
        }
    }

    /** 308 の Range: bytes=0-N から次に送る位置 N+1 を出す（ヘッダーがなければ 0）。 */
    private fun nextOffset(conn: HttpURLConnection): Long {
        val range = conn.getHeaderField("Range") ?: return 0
        return range.substringAfterLast('-').trim().toLong() + 1
    }
}
