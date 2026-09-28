package com.aorms.mobile.data

import android.content.Context

/**
 * Absolute session lifetime cap (2026-09-28) — the mobile equivalent of
 * web/lib/supabase/session-cap.ts's 24h cookie-based cap. Supabase's own
 * native server-side cap (`sessions_timebox`) would have covered mobile
 * too, but it's Pro-plan-gated (confirmed via the actual Supabase API
 * rejection: "User sessions can only be configured on Pro Plans and up"),
 * so this app enforces the same *policy* client-side instead — explicit
 * user direction that the cap be standard across every AORMS surface,
 * not just web.
 *
 * A plain SharedPreferences timestamp, not the Supabase session's own
 * JWT `iat`/`expiresAt` — those reset on every token refresh, which
 * would silently defeat an *absolute* cap (the whole point is "force
 * re-auth after 24h regardless of activity," not "after 24h since the
 * last refresh"). Stamped only at a genuine password sign-in
 * (AuthViewModel.signIn()) — deliberately not on every
 * SessionStatus.Authenticated emission, which also fires on ordinary
 * cold-start session revalidation.
 */
object SessionCap {
    private const val PREFS = "aorms_session_cap"
    private const val KEY_STARTED_AT = "started_at"
    const val CAP_MILLIS = 24 * 60 * 60 * 1000L

    fun stamp(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_STARTED_AT, System.currentTimeMillis())
            .apply()
    }

    fun isExpired(context: Context): Boolean {
        val startedAt = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getLong(KEY_STARTED_AT, 0L)
        return startedAt != 0L && System.currentTimeMillis() - startedAt > CAP_MILLIS
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }
}
