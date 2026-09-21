package com.aorms.mobile.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.Supa
import io.github.jan.supabase.auth.auth
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

    fun signIn() {
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
            } catch (e: HttpRequestException) {
                error = "Can't reach the server — check your connection"
            } catch (e: Exception) {
                error = "Invalid login credentials"
            } finally {
                loading = false
            }
        }
    }

    fun signOut() {
        viewModelScope.launch { Supa.auth.signOut() }
    }
}
