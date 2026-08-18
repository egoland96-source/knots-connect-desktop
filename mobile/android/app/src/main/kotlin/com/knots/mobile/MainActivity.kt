package com.knots.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.knots.mobile.ui.navigation.AppNavHost
import com.knots.mobile.ui.theme.KnotsTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContent {
            KnotsTheme {
                AppNavHost()
            }
        }
    }
}
