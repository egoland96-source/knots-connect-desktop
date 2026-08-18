package com.knots.mobile

import android.app.Application
import android.content.Context
import kotlin.math.min

class KnotsVpnApp : Application() {

    val appScope = kotlinx.coroutines.MainScope()

    override fun onCreate() {
        super.onCreate()
    }

    companion object {
        fun get(context: Context): KnotsVpnApp = context.applicationContext as KnotsVpnApp
    }
}
