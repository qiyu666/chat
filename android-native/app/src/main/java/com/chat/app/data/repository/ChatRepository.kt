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

    suspend fun getMoments(): List<Moment> = api.getMoments().body() ?: emptyList()
    suspend fun likeMoment(id: Int) = api.likeMoment(id)

    suspend fun getBalance(): Balance = api.getBalance().body() ?: Balance("0.00")
    suspend fun getTransactions(page: Int): TransactionPage =
        api.getTransactions(page).body() ?: TransactionPage(emptyList(), page, 0)
}
