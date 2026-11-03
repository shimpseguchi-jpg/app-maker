package com.shimpseguchi.photodrive

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * 送信待ちのデータをアプリ専用領域に暗号化して置くための形式。
 *
 * ファイルごとに使い捨ての AES-256 鍵を作り、その鍵は Android Keystore の鍵で包んで先頭に書く。
 * 本体は 1MB ごとに AES-GCM で暗号化するので、大きな動画でも好きな位置から少しずつ読み出せる。
 *
 *   [magic 4][version 1][包んだ鍵の長さ 2][包んだ鍵][平文の長さ 8][チャンク0][チャンク1]…
 *   チャンク = 平文(最大 CHUNK) + GCM タグ 16
 */
object SecureStore {
    const val CHUNK = 1 shl 20
    private const val TAG_BYTES = 16
    private const val MAGIC = 0x50445631 // "PDV1"
    private const val VERSION = 1
    private const val KEY_ALIAS = "photodrive_master"

    private val random = SecureRandom()

    @Synchronized
    private fun masterKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return gen.generateKey()
    }

    private fun wrap(fileKey: ByteArray): ByteArray {
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.ENCRYPT_MODE, masterKey())
        return c.iv + c.doFinal(fileKey)
    }

    private fun unwrap(wrapped: ByteArray): ByteArray {
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.DECRYPT_MODE, masterKey(), GCMParameterSpec(128, wrapped, 0, 12))
        return c.doFinal(wrapped, 12, wrapped.size - 12)
    }

    /** チャンク番号から IV を作る。鍵はファイルごとに違うので重複しない。 */
    private fun chunkCipher(mode: Int, key: SecretKeySpec, index: Long, total: Long): Cipher {
        val iv = ByteBuffer.allocate(12).putInt(0).putLong(index).array()
        return Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(mode, key, GCMParameterSpec(128, iv))
            updateAAD(ByteBuffer.allocate(16).putLong(index).putLong(total).array())
        }
    }

    /** input から length バイトを読み、暗号化して dest に書く（途中で失敗したら dest は残さない）。 */
    fun write(input: InputStream, length: Long, dest: File) {
        val tmp = File(dest.parentFile, dest.name + ".tmp")
        val fileKey = ByteArray(32).also { random.nextBytes(it) }
        try {
            val key = SecretKeySpec(fileKey, "AES")
            DataOutputStream(FileOutputStream(tmp).buffered()).use { out ->
                val wrapped = wrap(fileKey)
                out.writeInt(MAGIC)
                out.writeByte(VERSION)
                out.writeShort(wrapped.size)
                out.write(wrapped)
                out.writeLong(length)
                val buf = ByteArray(CHUNK)
                var index = 0L
                var remaining = length
                while (remaining > 0) {
                    val n = minOf(remaining, CHUNK.toLong()).toInt()
                    readFully(input, buf, n)
                    out.write(chunkCipher(Cipher.ENCRYPT_MODE, key, index, length).doFinal(buf, 0, n))
                    remaining -= n
                    index++
                }
                buf.fill(0)
            }
            if (!tmp.renameTo(dest)) throw IOException("rename failed")
        } catch (e: Exception) {
            tmp.delete()
            throw e
        } finally {
            fileKey.fill(0)
        }
    }

    private fun readFully(input: InputStream, buf: ByteArray, n: Int) {
        var off = 0
        while (off < n) {
            val r = input.read(buf, off, n - off)
            if (r < 0) throw EOFException()
            off += r
        }
    }

    class CorruptException(cause: Throwable) : GeneralSecurityException(cause)

    /** 暗号化済みファイルを開いて、平文の任意の範囲を読めるようにする。 */
    class Reader(file: File) : AutoCloseable {
        private val raf = RandomAccessFile(file, "r")
        private val key: SecretKeySpec
        private val dataStart: Long
        val length: Long

        init {
            try {
                val din = DataInputStream(FileInputStream(raf.fd).buffered())
                if (din.readInt() != MAGIC || din.readUnsignedByte() != VERSION) throw IOException("bad header")
                val wrapped = ByteArray(din.readUnsignedShort())
                din.readFully(wrapped)
                length = din.readLong()
                val raw = unwrap(wrapped)
                key = SecretKeySpec(raw, "AES")
                raw.fill(0)
                dataStart = 4L + 1 + 2 + wrapped.size + 8
            } catch (e: Exception) {
                raf.close()
                throw CorruptException(e)
            }
        }

        /** 平文の [offset, offset+count) を返す。 */
        fun read(offset: Long, count: Int): ByteArray {
            require(offset >= 0 && offset + count <= length)
            val out = ByteArray(count)
            var pos = offset
            var written = 0
            val enc = ByteArray(CHUNK + TAG_BYTES)
            while (written < count) {
                val index = pos / CHUNK
                val chunkPlain = minOf(CHUNK.toLong(), length - index * CHUNK).toInt()
                raf.seek(dataStart + index * (CHUNK + TAG_BYTES))
                raf.readFully(enc, 0, chunkPlain + TAG_BYTES)
                val plain = chunkCipher(Cipher.DECRYPT_MODE, key, index, length).doFinal(enc, 0, chunkPlain + TAG_BYTES)
                val inChunk = (pos - index * CHUNK).toInt()
                val n = minOf(chunkPlain - inChunk, count - written)
                System.arraycopy(plain, inChunk, out, written, n)
                plain.fill(0)
                written += n
                pos += n
            }
            return out
        }

        override fun close() = raf.close()
    }
}
