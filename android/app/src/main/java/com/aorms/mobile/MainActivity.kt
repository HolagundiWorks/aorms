package com.aorms.mobile

import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.aorms.mobile.ui.AormsApp
import com.aorms.mobile.ui.theme.AormsMobileTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Explicit `.light(...)`, not the default `auto(...)` — the app is
        // always Carbon's white theme now regardless of system dark mode
        // (Theme.kt), so status/nav bar icons must always be dark-on-light
        // too; `auto()` keys off the system dark-mode flag, not the app's
        // actual rendered background, and would render invisible white
        // icons on a white background for anyone with system dark mode on.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT),
        )
        setContent {
            AormsMobileTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AormsApp()
                }
            }
        }
    }
}
