package com.shimpseguchi.photodrive

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * アップロードの流れ：
 *  1. GAS ウェブアプリに「この名前・大きさで送りたい」と頼むと、Google Drive の
 *     再開可能アップロード用 URL が返ってくる（GAS が持ち主の権限で受付を作る）
 *  2. その URL へ 8MB ずつ直接 PUT する。途中で切れても続きから送れる
 */
object DriveUploader {
    /** 8MB（Drive の決まりで 256KB の倍数にする）。 */
    private const val PART = 32 * 256 * 1024

    class ServerException(message: String) : IOException(message)
    /** 受付 URL の期限切れなど。最初からやり直せばよい。 */
    class SessionGone : IOException("upload session expired")

    private fun postJson(url: String, body: JSONObject): JSONObject {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 30_000
            conn.readTimeout = 60_000
            conn.instanceFollowRedirects = true // GAS は script.googleusercontent.com へ転送して結果を返す
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
            val code = conn.responseCode
            val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) throw ServerException("HTTP $code")
            val json = try {
                JSONObject(text)
            } catch (e: Exception) {
                throw ServerException("GAS の応答が読めません（URL・公開設定を確認）")
            }
            if (!json.optBoolean("ok")) throw ServerException(json.optString("error", "不明なエラー"))
            return json
        } finally {
            conn.disconnect()
        }
    }

    /** 接続テスト。保存先フォルダ名を返す。 */
    fun ping(settings: AppSettings): String =
        postJson(settings.url, JSONObject().put("token", settings.token).put("action", "ping"))
            .optString("folder")

    fun startSession(settings: AppSettings, name: String, mimeType: String, size: Long): String =
        postJson(
            settings.url,
            JSONObject()
                .put("token", settings.token)
                .put("action", "start")
                .put("name", name)
                .put("mimeType", mimeType)
                .put("size", size)
        ).getString("uploadUrl")

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
