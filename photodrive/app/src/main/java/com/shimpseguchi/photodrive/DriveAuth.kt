package com.shimpseguchi.photodrive

import android.accounts.Account
import android.content.Context
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import com.google.android.gms.tasks.Tasks
import java.util.concurrent.TimeUnit

/** Google アカウントで Drive へ書き込む許可（アクセストークン）をもらう。 */
object DriveAuth {
    /** 指定したフォルダ（共有ドライブを含む）に書き込むため、Drive 全体の権限を使う。 */
    private const val SCOPE = "https://www.googleapis.com/auth/drive"

    fun request(account: String?): AuthorizationRequest =
        AuthorizationRequest.builder()
            .setRequestedScopes(listOf(Scope(SCOPE)))
            .apply { if (!account.isNullOrBlank()) setAccount(Account(account, "com.google")) }
            .build()

    fun client(ctx: Context) = Identity.getAuthorizationClient(ctx)

    @Suppress("DEPRECATION")
    fun accountOf(result: AuthorizationResult): String? = result.toGoogleSignInAccount()?.email

    /**
     * 画面を出さずにトークンをもらう（裏の送信係から呼ぶ）。
     * もう一度ログイン画面が必要なときは null。
     */
    fun tokenOrNull(ctx: Context, account: String): String? {
        val result = Tasks.await(client(ctx).authorize(request(account)), 60, TimeUnit.SECONDS)
        return if (result.hasResolution()) null else result.accessToken
    }

    /** 期限切れなどで使えなかったトークンを捨てて、次は新しいものをもらう。 */
    fun clearToken(ctx: Context, token: String) {
        runCatching { GoogleAuthUtil.clearToken(ctx, token) }
    }
}
