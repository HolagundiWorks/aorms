package com.aorms.mobile.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aorms.mobile.R

/**
 * IBM Carbon Design System (2026-09-20, explicit user request: "use same
 * carbon design system for ui" then "use light theme, use the same ui as
 * webportal, so users feel connected") — same governing rule as the web
 * app's own CLAUDE.md § UI: pure Carbon tokens, no Material default
 * styling. Token values pulled directly from the installed
 * `@carbon/themes` package (`node -e "require('@carbon/themes').white"`)
 * rather than guessed.
 *
 * Always Carbon's `white` theme, unconditionally — checked the web app
 * itself first (`grep -rn "g100\|data-theme" app/layout.tsx app/globals.
 * scss`, zero matches): it never applies a dark Carbon theme at all, so
 * matching it means light-only, not "light in light mode, dark in dark
 * mode." A `g100` variant was built in an earlier pass of this same
 * session and has been removed entirely, not just unused — the web app
 * has no dark mode to mirror, so keeping it around would be dead code
 * pretending to be a real product surface.
 *
 * Compose's ColorScheme is a Material concept, not a Carbon one — there's
 * no 1:1 field mapping, so each Carbon token below is placed at the
 * closest-matching Material3 role (`layer01` -> `surface`, `layer02` ->
 * `surfaceVariant`, etc.), the same kind of judgment call the six Pulse
 * KPI tiles already made when they hardcoded Carbon's data-viz palette
 * (Red 60, Orange 40, Yellow 30, Blue 60) directly — kept as-is here,
 * not touched, since those are already correct Carbon tokens.
 */

private val CarbonBlue60 = Color(0xFF0F62FE) // white theme's `interactive`/`focus`

private val LightColors = lightColorScheme(
    primary = CarbonBlue60,
    onPrimary = Color(0xFFFFFFFF), // textOnColor
    secondary = CarbonBlue60,
    onSecondary = Color(0xFFFFFFFF),
    background = Color(0xFFFFFFFF), // background
    onBackground = Color(0xFF161616), // textPrimary
    surface = Color(0xFFF4F4F4), // layer01
    onSurface = Color(0xFF161616), // textPrimary
    surfaceVariant = Color(0xFFFFFFFF), // layer02
    onSurfaceVariant = Color(0xFF525252), // textSecondary
    error = Color(0xFFDA1E28), // supportError
    onError = Color(0xFFFFFFFF),
    outline = Color(0xFFC6C6C6), // borderSubtle01
    outlineVariant = Color(0xFF8D8D8D), // borderStrong01
)

// Carbon is explicitly flat — no rounded edges (matches the web app's own
// 2026-09-14 UI-polish note in globals.scss: "no rounded edges, simple
// straight geometries"). Every Material3 shape slot zeroed out, not just
// the ones currently visible, so a future component (Dialog, Chip, ...)
// doesn't silently reintroduce Material's default rounding.
private val CarbonShapes = Shapes(
    extraSmall = RoundedCornerShape(0.dp),
    small = RoundedCornerShape(0.dp),
    medium = RoundedCornerShape(0.dp),
    large = RoundedCornerShape(0.dp),
    extraLarge = RoundedCornerShape(0.dp),
)

private val PlexSans = FontFamily(
    Font(R.font.ibm_plex_sans_regular, FontWeight.Normal),
    Font(R.font.ibm_plex_sans_semibold, FontWeight.SemiBold),
    Font(R.font.ibm_plex_sans_bold, FontWeight.Bold),
)

// A representative subset of Material3's type slots — every one this app's
// screens actually use (titleLarge/Medium/Small, headlineSmall, body*,
// label*) — re-pointed at IBM Plex Sans, Carbon's own typeface. Sizes/
// weights follow Material3's own defaults; only the font family changes,
// since Carbon's own type scale is a CSS/rem concept with no 1:1 sp
// mapping and re-deriving it exactly is a separate, larger effort than
// this pass's actual ask (the same typeface, not a new type scale).
private val CarbonTypography = Typography().let { base ->
    Typography(
        displayLarge = base.displayLarge.copy(fontFamily = PlexSans),
        displayMedium = base.displayMedium.copy(fontFamily = PlexSans),
        displaySmall = base.displaySmall.copy(fontFamily = PlexSans),
        headlineLarge = base.headlineLarge.copy(fontFamily = PlexSans),
        headlineMedium = base.headlineMedium.copy(fontFamily = PlexSans),
        headlineSmall = base.headlineSmall.copy(fontFamily = PlexSans, fontWeight = FontWeight.SemiBold),
        titleLarge = base.titleLarge.copy(fontFamily = PlexSans, fontWeight = FontWeight.SemiBold),
        titleMedium = base.titleMedium.copy(fontFamily = PlexSans, fontWeight = FontWeight.SemiBold),
        titleSmall = base.titleSmall.copy(fontFamily = PlexSans, fontWeight = FontWeight.SemiBold),
        bodyLarge = base.bodyLarge.copy(fontFamily = PlexSans),
        bodyMedium = base.bodyMedium.copy(fontFamily = PlexSans),
        bodySmall = base.bodySmall.copy(fontFamily = PlexSans),
        labelLarge = base.labelLarge.copy(fontFamily = PlexSans, fontWeight = FontWeight.SemiBold),
        labelMedium = base.labelMedium.copy(fontFamily = PlexSans),
        labelSmall = base.labelSmall.copy(fontFamily = PlexSans),
    )
}

@Composable
fun AormsMobileTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LightColors, shapes = CarbonShapes, typography = CarbonTypography, content = content)
}
