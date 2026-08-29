package com.chat.app.ui.contacts

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.chat.app.chatContainer
import com.chat.app.data.model.Contact
import com.chat.app.data.model.FriendRequest
import com.chat.app.data.model.User
import com.chat.app.data.repository.ChatRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ContactsUiState(
    val contacts: List<Contact> = emptyList(),
    val requests: List<FriendRequest> = emptyList(),
    val searchResults: List<User> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class ContactsViewModel(app: Application) : AndroidViewModel(app) {
    private val repository = ChatRepository(
        app.chatContainer.api,
        app.chatContainer,
        app.chatContainer.moshi
    )

    private val _uiState = MutableStateFlow(ContactsUiState())
    val uiState: StateFlow<ContactsUiState> = _uiState.asStateFlow()

    fun setLoading(v: Boolean) {
        _uiState.value = _uiState.value.copy(isLoading = v, error = null)
    }

    fun setError(v: String?) {
        _uiState.value = _uiState.value.copy(error = v)
    }

    fun loadContacts() {
        viewModelScope.launch {
            setLoading(true)
            runCatching { repository.getContacts() }
                .onSuccess { _uiState.value = _uiState.value.copy(contacts = it, isLoading = false) }
                .onFailure { _uiState.value = _uiState.value.copy(isLoading = false, error = it.message) }
        }
    }

    fun loadRequests() {
        viewModelScope.launch {
            setLoading(true)
            runCatching { repository.incomingRequests() }
                .onSuccess { _uiState.value = _uiState.value.copy(requests = it, isLoading = false) }
                .onFailure { _uiState.value = _uiState.value.copy(isLoading = false, error = it.message) }
        }
    }

    fun searchUser(query: String) {
        if (query.isBlank()) {
            _uiState.value = _uiState.value.copy(searchResults = emptyList())
            return
        }
        viewModelScope.launch {
            setLoading(true)
            runCatching { repository.searchUser(query) }
                .onSuccess { _uiState.value = _uiState.value.copy(searchResults = it, isLoading = false) }
                .onFailure { _uiState.value = _uiState.value.copy(isLoading = false, error = it.message) }
        }
    }

    fun deleteContact(contact: Contact) {
        viewModelScope.launch {
            runCatching { repository.deleteContact(contact.id) }
                .onSuccess {
                    if (it) loadContacts()
                }
        }
    }

    fun acceptRequest(request: FriendRequest) {
        viewModelScope.launch {
            runCatching { repository.acceptRequest(request.id) }
                .onSuccess {
                    if (it) loadRequests()
                }
        }
    }

    fun rejectRequest(request: FriendRequest) {
        viewModelScope.launch {
            runCatching { repository.rejectRequest(request.id) }
                .onSuccess {
                    if (it) loadRequests()
                }
        }
    }

    fun sendFriendRequest(username: String, message: String?) {
        viewModelScope.launch {
            setLoading(true)
            runCatching { repository.sendFriendRequest(username, message) }
                .onSuccess { _uiState.value = _uiState.value.copy(isLoading = false) }
                .onFailure { _uiState.value = _uiState.value.copy(isLoading = false, error = it.message) }
        }
    }

    fun refresh() {
        loadContacts()
        loadRequests()
    }
}
