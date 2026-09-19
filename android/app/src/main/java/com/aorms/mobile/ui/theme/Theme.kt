package com.aorms.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Carbon Blue 60 — same accent as the web app and the PWA shortcut
// (app/manifest.ts's theme_color), so all three surfaces read as one product.
private val AormsBlue = Color(0xFF0F62FE)
private val AormsBlueDark = Color(0xFF78A9FF)

private val LightColors = lightColorScheme(
    primary = AormsBlue,
    onPrimary = Color.White,
    secondary = AormsBlue,
)

private val DarkColors = darkColorScheme(
    primary = AormsBlueDark,
    onPrimary = Color.Black,
    secondary = AormsBlueDark,
)

@Composable
fun AormsMobileTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) DarkColors else LightColors
    MaterialTheme(colorScheme = colors, content = content)
}
