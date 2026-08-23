package com.chat.app.data.repository

import com.chat.app.data.api.ChatApi
import com.chat.app.data.di.AppContainer
import com.chat.app.data.model.*
import com.chat.app.data.model.ErrorResponse
import com.squareup.moshi.Moshi
import retrofit2.Response

/**
 * 统一封装错误处理；所有 ViewModel 通过 Repository 调用 API。
 */
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

    suspend fun <T> Result<T>.unwrap(): T = getOrElse { throw it }

    suspend fun login(username: String, password: String): AuthResponse {
        val res = api.login(LoginRequest(username, password))
        if (res.isSuccessful && res.body() != null) {
            val body = res.body()!!
            container.saveAuth(body.token, body.user)
            return body
        }
        error(parseError(res))
    }

    suspend fun register(username: String, password: String, chatCode: String?): AuthResponse {
        val res = api.register(RegisterRequest(username, password, chatCode))
        if (res.isSuccessful && res.body() != null) {
            val body = res.body()!!
            container.saveAuth(body.token, body.user)
            return body
        }
        error(parseError(res))
    }

    suspend fun getMe(): User? {
        val res = api.getMe()
        return if (res.isSuccessful) res.body() else null
    }

    suspend fun logout() = container.clearAuth()

    suspend fun getChats(): List<ChatSession> = api.getChats().body() ?: emptyList()
    suspend fun getMessages(chatId: Int): List<ChatMessage> = api.getMessages(chatId).body() ?: emptyList()
    suspend fun sendMessage(chatId: Int, content: String?, imageUrl: String?): ChatMessage? {
        val res = api.sendMessage(chatId, SendMessageRequest(content, imageUrl))
        if (!res.isSuccessful) error(parseError(res))
        return res.body()
    }

    suspend fun getContacts(): List<Contact> = api.getContacts().body() ?: emptyList()
    suspend fun searchUser(query: String): List<User> = api.searchUser(query).body() ?: emptyList()

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
        val res = api.getComments(momentId)
        return if (res.isSuccessful) res.body() ?: emptyList() else emptyList()
    }

    suspend fun addComment(momentId: String, content: String): Boolean {
        val res = api.addComment(momentId, mapOf("content" to content))
        return res.isSuccessful
    }

    suspend fun getBalance(): Balance = api.getBalance().body() ?: Balance("0.00")
    suspend fun getTransactions(page: Int): TransactionPage =
        api.getTransactions(page).body() ?: TransactionPage(emptyList(), page, 0)
}
