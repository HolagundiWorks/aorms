package com.aorms.mobile.data

import com.aorms.mobile.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest

/**
 * Single Supabase client for the whole app — same aorms-web project the
 * Next.js web app talks to (see android/app/build.gradle.kts's
 * buildConfigField comment). RLS on the server does all the firm-scoping;
 * this client just needs a signed-in session, exactly like the web app's
 * own session-scoped Supabase client. No separate backend for this app.
 */
object Supa {
    val client: SupabaseClient = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
    ) {
        install(Auth)
        install(Postgrest)
    }

    val auth get() = client.auth
    val db get() = client.postgrest
}
