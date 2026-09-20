package com.aorms.mobile.ui.theme

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.Card
import androidx.compose.material3.CardColors
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Carbon "Tile" (2026-09-20, explicit user request: "all use carbon
 * components, no [custom] items/elements/components — these need to be
 * pure Carbon design system"). Real constraint, stated plainly rather
 * than silently worked around: there is no official Carbon Design
 * System library for Android/Jetpack Compose — Carbon only ships web
 * implementations (React/Angular/Vue/vanilla). Compose's component
 * system (Material3) is what this app is built on and has to stay built
 * on; "pure Carbon" here means every screen's *visual* result matches
 * Carbon's actual components as closely as Compose allows, the same
 * governing intent as the web app's own CLAUDE.md § UI rule, not a
 * literal drop-in of Carbon's web components.
 *
 * A Material3 `Card` defaults to real elevation (a drop shadow) —
 * Carbon's Tile has none; Carbon separates surfaces from their
 * background with a flat fill and (depending on variant) a border, not
 * a shadow. `CarbonTile` is every `Card(...)` call site in this app
 * (Today/Tasks/Leads/Site/Account) routed through one shared composable
 * instead of six separately-fixed `CardDefaults.cardElevation(0.dp)`
 * call sites, so the "no shadow" rule can't quietly regress on the next
 * new screen the way it would if each screen set its own elevation.
 */
@Composable
fun CarbonTile(
    modifier: Modifier = Modifier,
    colors: CardColors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    border: BorderStroke? = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier,
        colors = colors,
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp, pressedElevation = 0.dp, focusedElevation = 0.dp, hoveredElevation = 0.dp),
        border = border,
        content = content,
    )
}
