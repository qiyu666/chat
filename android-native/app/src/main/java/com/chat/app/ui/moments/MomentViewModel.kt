package com.chat.app.ui.moments

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.chat.app.chatContainer
import com.chat.app.data.model.Moment
import com.chat.app.data.model.MomentComment
import com.chat.app.data.repository.ChatRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MomentViewModel(app: Application) : AndroidViewModel(app) {

    private val container = app.chatContainer
    private val repository = ChatRepository(container.api, container, container.moshi)

    data class UiState(
        val moments: List<Moment> = emptyList(),
        val loading: Boolean = false,
        val error: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _comments = MutableStateFlow<Map<String, List<MomentComment>>>(emptyMap())
    val comments: StateFlow<Map<String, List<MomentComment>>> = _comments.asStateFlow()

    private val _expandedIds = MutableStateFlow<Set<String>>(emptySet())
    val expandedIds: StateFlow<Set<String>> = _expandedIds.asStateFlow()

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            repository.getMoments().also { moments ->
                _uiState.value = _uiState.value.copy(moments = moments, loading = false, error = null)
            }
        }
    }

    fun toggleLike(moment: Moment) {
        val newLiked = !moment.liked
        val oldMoments = _uiState.value.moments
        val updated = oldMoments.map { m ->
            if (m.id == moment.id) m.copy(liked = newLiked, like_count = m.like_count + if (newLiked) 1 else -1) else m
        }
        _uiState.value = _uiState.value.copy(moments = updated)
        viewModelScope.launch {
            repository.toggleLike(moment.id)
        }
    }

    fun deleteMoment(momentId: String) {
        viewModelScope.launch {
            if (repository.deleteMoment(momentId)) {
                val updated = _uiState.value.moments.filter { it.id != momentId }
                _uiState.value = _uiState.value.copy(moments = updated)
            }
        }
    }

    fun toggleExpand(momentId: String) {
        val current = _expandedIds.value
        _expandedIds.value = if (current.contains(momentId)) current - momentId else current + momentId
        if (!_expandedIds.value.contains(momentId)) return
        if (_comments.value.containsKey(momentId)) return
        viewModelScope.launch {
            val list = repository.getComments(momentId)
            _comments.value = _comments.value + (momentId to list)
        }
    }

    fun addComment(momentId: String, content: String) {
        viewModelScope.launch {
            if (repository.addComment(momentId, content)) {
                val currentUser = container.currentUser()
                val newComment = MomentComment(
                    id = "",
                    moment_id = momentId,
                    user_id = currentUser?.id?.toString() ?: "",
                    username = currentUser?.username ?: "我",
                    avatar_url = currentUser?.avatar_url ?: "",
                    content = content,
                    created_at = java.time.Instant.now().toString()
                )
                val list = _comments.value[momentId] ?: emptyList()
                _comments.value = _comments.value + (momentId to (list + newComment))
                val updated = _uiState.value.moments.map { m ->
                    if (m.id == momentId) m.copy(comment_count = m.comment_count + 1) else m
                }
                _uiState.value = _uiState.value.copy(moments = updated)
            }
        }
    }

    fun createMoment(content: String, images: List<String>) {
        viewModelScope.launch {
            if (repository.createMoment(content, images)) {
                refresh()
            }
        }
    }
}
