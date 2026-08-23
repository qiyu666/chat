package com.chat.app.data.api

import com.chat.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ChatApi {

    // ===== 认证 =====
    @POST("auth/login")
    suspend fun login(@Body req: LoginRequest): Response<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body req: RegisterRequest): Response<AuthResponse>

    @GET("auth/me")
    suspend fun getMe(): Response<User>

    @PUT("auth/password")
    suspend fun changePassword(@Body body: Map<String, String>): Response<MessageResponse>

    @DELETE("auth/account")
    suspend fun deleteAccount(@Body body: Map<String, String>): Response<MessageResponse>

    // ===== 联系人 =====
    @GET("contacts")
    suspend fun getContacts(): Response<List<Contact>>

    @GET("contacts/search")
    suspend fun searchUser(@Query("q") query: String): Response<List<User>>

    @POST("contacts/add")
    suspend fun addFriend(@Body body: Map<String, String>): Response<MessageResponse>

    @DELETE("contacts/{id}")
    suspend fun deleteContact(@Path("id") id: Int): Response<MessageResponse>

    // ===== 好友申请 =====
    @GET("friend-requests/incoming")
    suspend fun incomingRequests(): Response<List<FriendRequest>>

    @POST("friend-requests/send")
    suspend fun sendFriendRequest(@Body body: Map<String, String>): Response<MessageResponse>

    @POST("friend-requests/{id}/accept")
    suspend fun acceptRequest(@Path("id") id: Int): Response<MessageResponse>

    @POST("friend-requests/{id}/reject")
    suspend fun rejectRequest(@Path("id") id: Int): Response<MessageResponse>

    // ===== 聊天 =====
    @GET("chats")
    suspend fun getChats(): Response<List<ChatSession>>

    @GET("chats/{chatId}/messages")
    suspend fun getMessages(@Path("chatId") chatId: Int): Response<List<ChatMessage>>

    @POST("chats/{chatId}/messages")
    suspend fun sendMessage(
        @Path("chatId") chatId: Int,
        @Body req: SendMessageRequest
    ): Response<ChatMessage>

    @DELETE("messages/{id}")
    suspend fun deleteMessage(@Path("id") id: Int): Response<MessageResponse>

    // ===== 朋友圈 =====
    @GET("moments")
    suspend fun getMoments(): Response<MomentsListResponse>

    @POST("moments")
    suspend fun createMoment(@Body body: Map<String, Any>): Response<MessageResponse>

    @POST("moments/{id}/like")
    suspend fun toggleLike(@Path("id") id: String): Response<ToggleLikeResponse>

    @DELETE("moments/{id}/delete")
    suspend fun deleteMoment(@Path("id") id: String): Response<MessageResponse>

    @GET("moments/{id}/comments")
    suspend fun getComments(@Path("id") id: String): Response<List<MomentComment>>

    @POST("moments/{id}/comments")
    suspend fun addComment(@Path("id") id: String, @Body body: Map<String, String>): Response<MessageResponse>

    // ===== 钱包 =====
    @GET("wallet/balance")
    suspend fun getBalance(): Response<Balance>

    @POST("wallet/set-password")
    suspend fun setWalletPassword(@Body body: Map<String, String>): Response<MessageResponse>

    @GET("wallet/transactions")
    suspend fun getTransactions(@Query("page") page: Int = 1): Response<TransactionPage>

    @POST("wallet/transfer")
    suspend fun transfer(@Body req: TransferRequest): Response<MessageResponse>

    @POST("wallet/redpacket/send")
    suspend fun sendRedPacket(@Body req: SendRedPacketRequest): Response<MessageResponse>

    @POST("wallet/redpacket/{id}/claim")
    suspend fun claimRedPacket(@Path("id") packetId: Int): Response<MessageResponse>
}
