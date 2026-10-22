package com.shimpseguchi.photodrive

import android.content.Context
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.GeneralSecurityException
import java.util.concurrent.TimeUnit

/** Wi-Fi のときだけ、送信待ちを古い順に Google Drive へ送り、送れたものから消す。 */
class UploadWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val ctx = applicationContext
        // 設定がないときは待つだけ（設定を保存したときにもう一度呼ばれる）
        val settings = AppSettings.load(ctx) ?: return@withContext Result.success()
        while (true) {
            val item = PhotoQueue.items(ctx).firstOrNull() ?: break
            if (!Network.isWifi(ctx) || isStopped) return@withContext Result.retry()
            try {
                if (uploadOne(ctx, settings, item)) item.delete() else return@withContext Result.retry()
            } catch (e: GeneralSecurityException) {
                // 壊れた・鍵が失われた（アプリのデータ消去など）ファイルは送れないので捨てる
                item.delete()
            } catch (e: Exception) {
                return@withContext Result.retry()
            }
        }
        Result.success()
    }

    private fun uploadOne(ctx: Context, settings: AppSettings, item: PhotoQueue.Item): Boolean {
        SecureStore.Reader(item.file).use { reader ->
            repeat(2) {
                val session = item.sessionFile.takeIf { it.exists() }?.readText()
                    ?: DriveUploader.startSession(settings, item.name, item.mimeType, reader.length)
                        .also { item.sessionFile.writeText(it) }
                try {
                    return DriveUploader.upload(session, reader) { Network.isWifi(ctx) && !isStopped }
                } catch (e: DriveUploader.SessionGone) {
                    item.sessionFile.delete() // 期限切れ：新しい受付を作って最初から
                }
            }
            return false
        }
    }

    companion object {
        const val WORK_NAME = "upload"

        fun enqueue(ctx: Context) {
            val constraints = Constraints.Builder().apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    setRequiredNetworkRequest(
                        NetworkRequest.Builder()
                            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                            .build(),
                        NetworkType.UNMETERED
                    )
                } else {
                    setRequiredNetworkType(NetworkType.UNMETERED)
                }
            }.build()
            val request = OneTimeWorkRequestBuilder<UploadWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(ctx).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }
    }
}
