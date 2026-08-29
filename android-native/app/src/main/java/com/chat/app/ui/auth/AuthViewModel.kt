package com.chat.app.ui.auth

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.chat.app.chatContainer
import com.chat.app.data.repository.ChatRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(app: Application) : AndroidViewModel(app) {
    private val container = app.chatContainer
    private val repository = ChatRepository(container.api, container, container.moshi)

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun switchMode() {
        _uiState.value = _uiState.value.copy(
            mode = if (_uiState.value.mode == AuthMode.LOGIN) AuthMode.REGISTER else AuthMode.LOGIN,
            error = null,
            loading = false
        )
    }

    fun updateUsername(v: String) { _uiState.value = _uiState.value.copy(username = v) }
    fun updatePassword(v: String) { _uiState.value = _uiState.value.copy(password = v) }
    fun updateChatCode(v: String) { _uiState.value = _uiState.value.copy(chatCode = v) }

    fun submit(onSuccess: () -> Unit) {
        val s = _uiState.value
        if (s.username.isBlank() || s.password.isBlank()) {
            _uiState.value = s.copy(error = "请填写用户名和密码")
            return
        }
        _uiState.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching {
                val result = when (s.mode) {
                    AuthMode.LOGIN -> repository.login(s.username.trim(), s.password)
                    AuthMode.REGISTER -> repository.register(s.username.trim(), s.password, s.chatCode.ifBlank { null })
                }
                if (result.user == null) throw IllegalStateException("服务端返回的用户信息为空")
                result
            }.onSuccess {
                _uiState.value = _uiState.value.copy(loading = false)
                onSuccess()
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(loading = false, error = e.message ?: "操作失败")
            }
        }
    }

    fun logout() {
        viewModelScope.launch { repository.logout() }
    }
}

enum class AuthMode { LOGIN, REGISTER }

data class AuthUiState(
    val mode: AuthMode = AuthMode.LOGIN,
    val username: String = "",
    val password: String = "",
    val chatCode: String = "",
    val loading: Boolean = false,
    val error: String? = null
)
