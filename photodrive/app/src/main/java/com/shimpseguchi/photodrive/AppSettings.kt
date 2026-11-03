package com.shimpseguchi.photodrive

import android.content.Context

/** 送信先の設定（ログインした Google アカウントと保存先フォルダ）。 */
data class AppSettings(val account: String, val folderId: String) {
    companion object {
        private const val PREFS = "settings"

        private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        fun load(ctx: Context): AppSettings? {
            val account = account(ctx)
            val folderId = folderId(ctx)
            return if (account.isNotBlank() && folderId.isNotBlank()) AppSettings(account, folderId) else null
        }

        fun account(ctx: Context) = prefs(ctx).getString("account", "").orEmpty()
        fun folderId(ctx: Context) = prefs(ctx).getString("folderId", "").orEmpty()
        fun folderName(ctx: Context) = prefs(ctx).getString("folderName", "").orEmpty()

        fun saveAccount(ctx: Context, account: String) =
            prefs(ctx).edit().putString("account", account).putBoolean("needsLogin", false).apply()

        fun saveFolder(ctx: Context, id: String, name: String) =
            prefs(ctx).edit().putString("folderId", id).putString("folderName", name).apply()

        fun signOut(ctx: Context) = prefs(ctx).edit().remove("account").putBoolean("needsLogin", false).apply()

        /** 裏で送ろうとしたら、もう一度ログイン（許可）が必要だった。 */
        fun needsLogin(ctx: Context) = prefs(ctx).getBoolean("needsLogin", false)
        fun setNeedsLogin(ctx: Context, value: Boolean) = prefs(ctx).edit().putBoolean("needsLogin", value).apply()

        /** フォルダの URL（…/folders/ID?usp=…）でも ID だけでも受け付ける。 */
        fun parseFolderId(input: String): String {
            val s = input.trim()
            Regex("""/folders/([A-Za-z0-9_-]+)""").find(s)?.let { return it.groupValues[1] }
            Regex("""[?&]id=([A-Za-z0-9_-]+)""").find(s)?.let { return it.groupValues[1] }
            return s
        }
    }
}
