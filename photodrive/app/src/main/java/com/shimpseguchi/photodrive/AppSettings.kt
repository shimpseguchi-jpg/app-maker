package com.shimpseguchi.photodrive

import android.content.Context

/** 送信先（GAS ウェブアプリ）の設定。 */
data class AppSettings(val url: String, val token: String) {
    companion object {
        private const val PREFS = "settings"

        fun load(ctx: Context): AppSettings? {
            val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val url = p.getString("url", "").orEmpty()
            val token = p.getString("token", "").orEmpty()
            return if (url.isNotBlank() && token.isNotBlank()) AppSettings(url, token) else null
        }

        fun rawUrl(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("url", "").orEmpty()
        fun rawToken(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("token", "").orEmpty()

        fun save(ctx: Context, url: String, token: String) {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("url", url.trim())
                .putString("token", token.trim())
                .apply()
        }
    }
}
