package com.shimpseguchi.photodrive

import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.ByteArrayOutputStream
import kotlin.random.Random

/** Drive API と再開可能アップロードを真似たサーバーで、送信の手順を確かめる。 */
class DriveUploaderTest {
    private val server = MockWebServer()
    private val base get() = server.url("/").toString().trimEnd('/')

    private val received = ByteArrayOutputStream()
    /** 1回目の PUT では、受け取った量より少なく「ここまで受け取った」と返す（途中切れの再現）。 */
    private var shortAckOnce = true
    private var lastStart: RecordedRequest? = null
    private var lastStartBody: JSONObject? = null

    @Before
    fun setUp() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val path = request.path.orEmpty()
                return when {
                    path == "/session" -> session(request)
                    request.getHeader("Authorization") != "Bearer good" ->
                        MockResponse().setResponseCode(401).setBody("""{"error":{"message":"Invalid Credentials"}}""")
                    path.startsWith("/drive/v3/files/folder1?") -> json("""{"name":"現場写真","mimeType":"application/vnd.google-apps.folder"}""")
                    path.startsWith("/drive/v3/files/file1?") -> json("""{"name":"a.jpg","mimeType":"image/jpeg"}""")
                    path.startsWith("/drive/v3/files/") ->
                        MockResponse().setResponseCode(404).setBody("""{"error":{"message":"File not found"}}""")
                    path.startsWith("/upload/drive/v3/files?uploadType=resumable") -> {
                        lastStart = request
                        lastStartBody = JSONObject(request.body.readUtf8())
                        MockResponse().setHeader("Location", "$base/session")
                    }
                    else -> MockResponse().setResponseCode(500)
                }
            }
        }
        server.start()
        DriveUploader.apiBase = base
    }

    private fun json(body: String) = MockResponse().setHeader("Content-Type", "application/json").setBody(body)

    @After
    fun tearDown() = server.shutdown()

    private fun session(request: RecordedRequest): MockResponse {
        val range = request.getHeader("Content-Range")!!
        val body = request.body.readByteArray()
        val total: Long
        if (range.startsWith("bytes */")) {
            total = range.removePrefix("bytes */").toLong()
        } else {
            val m = Regex("""bytes (\d+)-(\d+)/(\d+)""").matchEntire(range)!!
            total = m.groupValues[3].toLong()
            check(m.groupValues[1].toLong() == received.size().toLong()) { "続きの位置がずれている: $range" }
            if (shortAckOnce && body.size > 1000) {
                shortAckOnce = false
                received.write(body, 0, 1000)
            } else {
                received.write(body)
            }
        }
        if (received.size().toLong() == total) return MockResponse().setResponseCode(200)
        val res = MockResponse().setResponseCode(308)
        if (received.size() > 0) res.setHeader("Range", "bytes=0-${received.size() - 1}")
        return res
    }

    private fun reader(data: ByteArray): (Long, Int) -> ByteArray =
        { off, n -> data.copyOfRange(off.toInt(), off.toInt() + n) }

    @Test
    fun folderNameWithToken() {
        assertEquals("現場写真", DriveUploader.folderName("good", "folder1"))
    }

    @Test(expected = DriveUploader.AuthException::class)
    fun expiredTokenIsAuthError() {
        DriveUploader.folderName("expired", "folder1")
    }

    @Test
    fun missingFolderIsReadable() {
        val e = runCatching { DriveUploader.folderName("good", "nope") }.exceptionOrNull()
        assertTrue(e is DriveUploader.ServerException)
        assertTrue(e!!.message!!.contains("見つかりません"))
    }

    @Test(expected = DriveUploader.ServerException::class)
    fun fileIsNotFolder() {
        DriveUploader.folderName("good", "file1")
    }

    @Test
    fun startSendsFileInfo() {
        val url = DriveUploader.startSession("good", "folder1", "a.mp4", "video/mp4", 123)
        assertEquals("$base/session", url)
        assertEquals("a.mp4", lastStartBody!!.getString("name"))
        assertEquals("folder1", lastStartBody!!.getJSONArray("parents").getString(0))
        assertEquals("video/mp4", lastStart!!.getHeader("X-Upload-Content-Type"))
        assertEquals("123", lastStart!!.getHeader("X-Upload-Content-Length"))
    }

    @Test(expected = DriveUploader.AuthException::class)
    fun startWithExpiredToken() {
        DriveUploader.startSession("expired", "folder1", "a.jpg", "image/jpeg", 1)
    }

    @Test
    fun uploadsLargeFileInPartsAndResumes() {
        val data = Random(1).nextBytes(20 * 1024 * 1024 + 12345) // 8MB ずつ3回以上に分かれる大きさ
        assertTrue(DriveUploader.upload("$base/session", data.size.toLong(), reader(data)) { true })
        assertArrayEquals(data, received.toByteArray())
    }

    @Test
    fun stopsWhenWifiLostAndContinuesLater() {
        val data = Random(2).nextBytes(9 * 1024 * 1024)
        var calls = 0
        assertFalse(DriveUploader.upload("$base/session", data.size.toLong(), reader(data)) { calls++ < 1 })
        assertTrue(received.size() < data.size)
        assertTrue(DriveUploader.upload("$base/session", data.size.toLong(), reader(data)) { true })
        assertArrayEquals(data, received.toByteArray())
    }

    @Test
    fun alreadyCompleteIsDone() {
        val data = ByteArray(10) { it.toByte() }
        received.write(data)
        assertTrue(DriveUploader.upload("$base/session", data.size.toLong(), reader(data)) { true })
        assertEquals(10, received.size())
    }
}
