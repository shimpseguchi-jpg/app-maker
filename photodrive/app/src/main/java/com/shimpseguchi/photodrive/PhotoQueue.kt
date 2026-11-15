package com.shimpseguchi.photodrive

import android.content.Context
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 送信待ちの写真・動画。アプリ専用・バックアップ対象外の領域（no_backup）に暗号化して置く。
 * ファイル名は「アップロード後の名前.enc」。送信が終わったら削除する。
 */
object PhotoQueue {
    private const val EXT = ".enc"

    private fun dir(ctx: Context) = File(ctx.noBackupFilesDir, "queue").apply { mkdirs() }

    /** 録画中のファイル置き場（録画が終わったらすぐ暗号化して消す）。 */
    fun recordingDir(ctx: Context) = File(ctx.noBackupFilesDir, "recording").apply { mkdirs() }

    fun newName(ext: String): String =
        SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US).format(Date()) + "." + ext

    fun addBytes(ctx: Context, name: String, data: ByteArray) {
        try {
            SecureStore.write(ByteArrayInputStream(data), data.size.toLong(), File(dir(ctx), name + EXT))
        } finally {
            data.fill(0)
        }
    }

    /** 平文ファイルを暗号化して送信待ちに入れ、元のファイルは消す。 */
    fun addFile(ctx: Context, name: String, plain: File) {
        try {
            FileInputStream(plain).use { SecureStore.write(it, plain.length(), File(dir(ctx), name + EXT)) }
        } finally {
            plain.delete()
        }
    }

    /** 前回録画中にアプリが落ちたなどで残った平文ファイルを、暗号化して送信待ちに回す。 */
    fun rescueRecordings(ctx: Context) {
        dir(ctx).listFiles { f -> f.name.endsWith(".tmp") }?.forEach { it.delete() }
        recordingDir(ctx).listFiles()?.forEach { f ->
            if (f.length() > 0) runCatching { addFile(ctx, f.name, f) }
            f.delete()
        }
    }

    fun items(ctx: Context): List<Item> =
        dir(ctx).listFiles { f -> f.name.endsWith(EXT) }
            ?.sortedBy { it.name }
            ?.map { Item(it) }
            .orEmpty()

    fun count(ctx: Context) = items(ctx).size

    fun clear(ctx: Context) {
        dir(ctx).listFiles()?.forEach { it.delete() }
    }

    class Item(val file: File) {
        val name: String = file.name.removeSuffix(EXT)
        val mimeType: String = when (name.substringAfterLast('.').lowercase()) {
            "mp4" -> "video/mp4"
            else -> "image/jpeg"
        }
        /** Drive の再開可能アップロードの URL（途中から続けるために覚えておく）。 */
        val sessionFile = File(file.parentFile, "$name.session")

        fun delete() {
            file.delete()
            sessionFile.delete()
        }
    }
}
