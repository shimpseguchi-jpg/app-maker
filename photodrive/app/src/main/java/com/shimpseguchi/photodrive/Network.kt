package com.shimpseguchi.photodrive

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities

object Network {
    /** いまの通信が Wi-Fi でインターネットにつながっているか。 */
    fun isWifi(ctx: Context): Boolean {
        val cm = ctx.getSystemService(ConnectivityManager::class.java) ?: return false
        val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
