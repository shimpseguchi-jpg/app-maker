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

/** GAS と Drive の再開可能アップロードを真似たサーバーで、送信の手順を確かめる。 */
class DriveUploaderTest {
    private val server = MockWebServer()
    private val base get() = server.url("/").toString().trimEnd('/')

    private val received = ByteArrayOutputStream()
    /** 1回目の PUT では、受け取った量より少なく「ここまで受け取った」と返す（途中切れの再現）。 */
    private var shortAckOnce = true
    private var lastStartBody: JSONObject? = null
    private var resultJson = ""

    @Before
    fun setUp() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse = when (request.path) {
                "/exec" -> gas(request)
                "/echo" -> MockResponse().setHeader("Content-Type", "application/json").setBody(resultJson)
                "/session" -> session(request)
                else -> MockResponse().setResponseCode(404)
            }
        }
        server.start()
    }

    @After
    fun tearDown() = server.shutdown()

    // GAS: POST を受けたら別 URL へ 302 で転送し、転送先（GET）で結果を返す
    private fun gas(request: RecordedRequest): MockResponse {
        val body = JSONObject(request.body.readUtf8())
        lastStartBody = body
        resultJson = when {
            body.getString("token") != "secret" -> JSONObject().put("ok", false).put("error", "合言葉が違います")
            body.getString("action") == "ping" -> JSONObject().put("ok", true).put("folder", "現場写真")
            else -> JSONObject().put("ok", true).put("uploadUrl", "$base/session")
        }.toString()
        return MockResponse().setResponseCode(302).setHeader("Location", "$base/echo")
    }

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
    fun pingFollowsGasRedirect() {
        assertEquals("現場写真", DriveUploader.ping(AppSettings("$base/exec", "secret")))
    }

    @Test(expected = DriveUploader.ServerException::class)
    fun wrongTokenIsError() {
        DriveUploader.ping(AppSettings("$base/exec", "wrong"))
    }

    @Test
    fun startSendsFileInfo() {
        val url = DriveUploader.startSession(AppSettings("$base/exec", "secret"), "a.mp4", "video/mp4", 123)
        assertEquals("$base/session", url)
        assertEquals("a.mp4", lastStartBody!!.getString("name"))
        assertEquals(123, lastStartBody!!.getLong("size"))
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
