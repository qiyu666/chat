package com.chat.app.data.repository

import com.chat.app.data.api.ChatApi
import com.chat.app.data.di.AppContainer
import com.chat.app.data.model.*
import com.squareup.moshi.Moshi
import retrofit2.Response

class ChatRepository(
    private val api: ChatApi,
    private val container: AppContainer,
    private val moshi: Moshi
) {
    private fun parseError(res: Response<*>): String {
        return runCatching {
            res.errorBody()?.string()?.let { body ->
                moshi.adapter(ErrorResponse::class.java).fromJson(body)?.error
            }
        }.getOrNull() ?: "请求失败 (${res.code()})"
    }

    suspend fun login(username: String, password: String): AuthResponse {
        val res = api.login(LoginRequest(username, password))
        if (res.isSuccessful && res.body() != null) {
            val body = res.body()!!
            android.util.Log.d("ChatRepository", "login: token=${body.token?.take(8)}... user=${body.user?.username ?: "null"}")
            if (body.user != null) container.saveAuth(body.token, body.user)
            return body
        }
        error(parseError(res))
    }

    suspend fun register(username: String, password: String, chatCode: String?): AuthResponse {
        val res = api.register(RegisterRequest(username, password, chatCode))
        if (res.isSuccessful && res.body() != null) {
            val body = res.body()!!
            android.util.Log.d("ChatRepository", "register: token=${body.token?.take(8)}... user=${body.user?.username ?: "null"}")
            if (body.user != null) container.saveAuth(body.token, body.user)
            return body
        }
        error(parseError(res))
    }

    suspend fun getMe(): User? {
        val res = api.getMe()
        return if (res.isSuccessful) res.body() else null
    }

    suspend fun logout() = container.clearAuth()

    suspend fun getChats(): List<ChatSession> {
        return runCatching {
            val sessions = api.getChats().body() ?: emptyList()
            if (sessions.isEmpty()) return@runCatching emptyList()
            // Enrich chat session names using contacts data (server returns friend_id=D1ID, not username)
            val contacts = runCatching { api.getContacts().body() ?: emptyList() }.getOrNull() ?: emptyList()
            val usernameMap = contacts.associateBy({ it.id }, { it.username })
            sessions.map { s ->
                val friendId = s.friend_id_raw
                if (friendId != null && usernameMap.containsKey(friendId)) {
                    s.copy(name = usernameMap[friendId])
                } else {
                    s
                }
            }
        }
            .onFailure { android.util.Log.e("ChatRepository", "getChats failed: ${it.message}") }
            .getOrElse { emptyList() }
    }

    suspend fun getMessages(chatId: String): List<ChatMessage> {
        val result = api.getMessages(chatId)
        if (!result.isSuccessful) {
            val errMsg = parseError(result)
            android.util.Log.e("ChatRepository", "getMessages ${result.code()}: $errMsg")
            error(errMsg)
        }
        val body = result.body()
        android.util.Log.d("ChatRepository", "getMessages $chatId -> ${body?.messages?.size ?: 0} messages")
        return body?.messages ?: emptyList()
    }

    suspend fun sendMessage(chatId: String, content: String?, imageUrl: String?): ChatMessage? {
        val res = api.sendMessage(chatId, SendMessageRequest(content, imageUrl))
        if (!res.isSuccessful) error(parseError(res))
        return res.body()
    }

    suspend fun getContacts(): List<Contact> {
        return runCatching { api.getContacts().body() ?: emptyList() }
            .onFailure { android.util.Log.e("ChatRepository", "getContacts failed: ${it.message}") }
            .getOrElse { emptyList() }
    }

    suspend fun searchUser(query: String): List<User> {
        return runCatching { api.searchUser(query).body() ?: emptyList() }
            .onFailure { android.util.Log.e("ChatRepository", "searchUser failed: ${it.message}") }
            .getOrElse { emptyList() }
    }

    suspend fun addFriend(username: String): Boolean {
        val res = api.addFriend(mapOf("username" to username))
        return res.isSuccessful
    }

    suspend fun deleteContact(id: String): Boolean {
        val res = api.deleteContact(id)
        return res.isSuccessful
    }

    suspend fun incomingRequests(): List<FriendRequest> = api.incomingRequests().body() ?: emptyList()
    suspend fun sendFriendRequest(username: String, message: String? = null): Boolean {
        val body = mutableMapOf<String, String>("username" to username)
        if (!message.isNullOrBlank()) body["message"] = message
        val res = api.sendFriendRequest(body)
        return res.isSuccessful
    }
    suspend fun acceptRequest(id: String): Boolean = api.acceptRequest(id).isSuccessful
    suspend fun rejectRequest(id: String): Boolean = api.rejectRequest(id).isSuccessful

    suspend fun getMoments(): List<Moment> {
        val res = api.getMoments()
        return if (res.isSuccessful) res.body()?.moments ?: emptyList() else emptyList()
    }

    suspend fun createMoment(content: String, images: List<String>?): Boolean {
        val body = mutableMapOf<String, Any>("content" to content)
        if (!images.isNullOrEmpty()) body["images"] = images
        val res = api.createMoment(body)
        return res.isSuccessful
    }

    suspend fun toggleLike(momentId: String): Boolean {
        val res = api.toggleLike(momentId)
        return res.isSuccessful && res.body()?.liked == true
    }

    suspend fun deleteMoment(momentId: String): Boolean {
        val res = api.deleteMoment(momentId)
        return res.isSuccessful
    }

    suspend fun getComments(momentId: String): List<MomentComment> {
        return runCatching { api.getComments(momentId).body() ?: emptyList() }
            .onFailure { android.util.Log.e("ChatRepository", "getComments failed: ${it.message}") }
            .getOrElse { emptyList() }
    }

    suspend fun addComment(momentId: String, content: String): Boolean {
        val res = api.addComment(momentId, mapOf("content" to content))
        return res.isSuccessful
    }

    suspend fun getBalance(): Balance = api.getBalance().body() ?: Balance("0.00")
    suspend fun getTransactions(page: Int): TransactionPage =
        api.getTransactions(page).body() ?: TransactionPage(emptyList(), page, 0)
}
