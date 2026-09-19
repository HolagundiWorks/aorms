package com.aorms.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
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
        enableEdgeToEdge()
        setContent {
            AormsMobileTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AormsApp()
                }
            }
        }
    }
}
