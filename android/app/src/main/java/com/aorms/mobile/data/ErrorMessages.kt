package com.aorms.mobile.data

import io.github.jan.supabase.postgrest.exception.PostgrestRestException

/**
 * Safe, user-facing text for a caught exception. Never surfaces a raw
 * PostgrestRestException.message: that string embeds the full request URL
 * and Authorization header (a bearer JWT), which must never land in a UI
 * Snackbar. Use `.error`/`.code`, the exception's own parsed fields, instead.
 */
fun Throwable.toUserMessage(): String = when (this) {
    is PostgrestRestException -> when (code) {
        "42501" -> "You don't have permission to do this."
        else -> error.ifBlank { "Something went wrong. Please try again." }
    }
    else -> "Something went wrong. Please try again."
}
