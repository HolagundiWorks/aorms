package com.aorms.mobile.ui.auth

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.SessionCap
import com.aorms.mobile.data.Supa
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.exception.AuthRestException
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.exceptions.HttpRequestException
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel : ViewModel() {
    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var loading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    val sessionStatus: StateFlow<SessionStatus> = Supa.auth.sessionStatus

    fun signIn(context: Context) {
        if (email.isBlank() || password.isBlank()) {
            error = "Enter your email and password."
            return
        }
        loading = true
        error = null
        viewModelScope.launch {
            try {
                Supa.auth.signInWith(Email) {
                    this.email = this@AuthViewModel.email
                    this.password = this@AuthViewModel.password
                }
                // Genuine password sign-in only — stamped here, not in
                // AppNav.kt's sessionStatus observer, which also fires on
                // ordinary cold-start session revalidation and would
                // silently reset the cap on every app open.
                SessionCap.stamp(context)
            } catch (e: HttpRequestException) {
                error = "Can't reach the server — check your connection"
            } catch (e: AuthRestException) {
                // 2026-09-27: was a fixed "Invalid login credentials" string
                // for every non-network failure — masked real causes (rate
                // limiting, etc.) as a wrong-password error. AuthRestException's
                // own `errorDescription` is Supabase's clean, user-safe message
                // for exactly this case (e.g. "Invalid login credentials") —
                // use that, not `e.message`/`toString()`, which (confirmed live
                // on device) dumps the full HTTP request including headers.
                error = e.errorDescription.ifBlank { "Invalid login credentials" }
            } catch (e: Exception) {
                error = "Invalid login credentials"
            } finally {
                loading = false
            }
        }
    }

    fun signOut(context: Context) {
        viewModelScope.launch { Supa.auth.signOut() }
        SessionCap.clear(context)
    }
}
