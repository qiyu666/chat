package com.chat.app.data.model

import com.squareup.moshi.JsonClass

// ============ 认证 ============
@JsonClass(generateAdapter = true)
data class LoginRequest(
    val username: String,
    val password: String
)

@JsonClass(generateAdapter = true)
data class RegisterRequest(
    val username: String,
    val password: String,
    val chat_code: String? = null
)

@JsonClass(generateAdapter = true)
data class AuthResponse(
    val token: String,
    val user: User
)

@JsonClass(generateAdapter = true)
data class User(
    val id: Int,
    val username: String,
    val chat_code: String?,
    val avatar_url: String? = null,
    val nickname: String? = null
)

// ============ 聊天 ============
@JsonClass(generateAdapter = true)
data class ChatSession(
    val id: Int,
    val name: String,
    val avatar: String? = null,
    val last_message: String? = null,
    val last_at: String? = null,
    val unread: Int = 0
)

@JsonClass(generateAdapter = true)
data class ChatMessage(
    val id: Int,
    val sender_id: Int,
    val sender_name: String? = null,
    val content: String? = null,
    val image_url: String? = null,
    val created_at: String? = null,
    val is_mine: Boolean? = null,
    val safe_sender_id: Int? = null,
    val packet_id: String? = null,
    val claimed: Boolean? = null
)

@JsonClass(generateAdapter = true)
data class SendMessageRequest(
    val content: String? = null,
    val imageUrl: String? = null
)

// ============ 联系人 ============
@JsonClass(generateAdapter = true)
data class Contact(
    val id: Int,
    val user_id: Int,
    val username: String,
    val nickname: String? = null,
    val avatar_url: String? = null,
    val chat_code: String? = null
)

@JsonClass(generateAdapter = true)
data class FriendRequest(
    val id: Int,
    val from_username: String,
    val message: String? = null,
    val created_at: String
)

// ============ 朋友圈 ============
@JsonClass(generateAdapter = true)
data class Moment(
    val id: String,
    val user_id: String,
    val username: String,
    val avatar_url: String? = null,
    val content: String,
    val images: List<String>? = null,
    val like_count: Int = 0,
    val comment_count: Int = 0,
    val liked: Boolean = false,
    val created_at: String
)

@JsonClass(generateAdapter = true)
data class MomentComment(
    val id: String,
    val moment_id: String,
    val user_id: String,
    val username: String,
    val avatar_url: String? = null,
    val content: String,
    val created_at: String
)

@JsonClass(generateAdapter = true)
data class MomentsListResponse(
    val moments: List<Moment>
)

@JsonClass(generateAdapter = true)
data class ToggleLikeResponse(
    val liked: Boolean
)

// ============ 钱包 ============
@JsonClass(generateAdapter = true)
data class Balance(
    val balance: String
)

@JsonClass(generateAdapter = true)
data class Transaction(
    val id: Int,
    val type: String,
    val amount: String,
    val counterparty: String? = null,
    val status: String,
    val created_at: String
)

@JsonClass(generateAdapter = true)
data class TransactionPage(
    val items: List<Transaction>,
    val page: Int,
    val total: Int
)

@JsonClass(generateAdapter = true)
data class SendRedPacketRequest(
    val amount: String,
    val chatId: Int,
    val message: String?,
    val password: String
)

@JsonClass(generateAdapter = true)
data class TransferRequest(
    val targetUsername: String,
    val amount: String,
    val password: String
)

// ============ 通用 ============
@JsonClass(generateAdapter = true)
data class ErrorResponse(
    val error: String
)

@JsonClass(generateAdapter = true)
data class MessageResponse(
    val message: String? = null
)
