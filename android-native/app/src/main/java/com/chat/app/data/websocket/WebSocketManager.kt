package com.chat.app.data.websocket

import android.util.Log
import com.chat.app.data.model.ChatMessage
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class WebSocketManager(private val baseUrl: String, private val token: String) {

    companion object {
        private const val TAG = "WebSocketManager"
        private const val RECONNECT_DELAY_MS = 3000L
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .build()

    private var ws: WebSocket? = null

    @Volatile
    private var reconnectTimer: java.util.Timer? = null
    @Volatile
    private var currentChatId: String? = null
    @Volatile
    private var isDisposed = false

    private val _channel = Channel<ChatMessage>(capacity = 256)
    val messages: Flow<ChatMessage> = _channel.receiveAsFlow()

    @Volatile
    var isConnected = false
        private set

    fun connect(chatId: String) {
        Log.d(TAG, "connect: chatId=$chatId, currentWs=${ws != null}")
        if (ws != null) {
            try { ws?.close(1000, "reconnect") } catch (_: Exception) {}
            ws = null
        }
        currentChatId = chatId
        isDisposed = false
        doConnect(chatId)
    }

    private fun doConnect(chatId: String) {
        val wsBase = baseUrl.replaceFirst("https://", "wss://").replaceFirst("http://", "ws://")
            .removeSuffix("/api").removeSuffix("/api/")
        val wsUrl = android.net.Uri.Builder()
            .scheme(wsBase.substringBefore("://"))
            .authority(wsBase.substringAfter("://").substringBefore("/"))
            .appendPath("api")
            .appendPath("ws")
            .appendQueryParameter("token", token)
            .appendQueryParameter("chatId", chatId)
            .build()
            .toString()
        Log.d(TAG, "doConnect: url=$wsUrl")

        val request = Request.Builder()
            .url(wsUrl)
            .header("Authorization", "Bearer $token")
            .build()

        try {
            ws = client.newWebSocket(request, object : WebSocketListener() {
                override fun onOpen(websocket: WebSocket, response: Response) {
                    Log.d(TAG, "WS onOpen: chatId=$chatId status=${response.code}")
                    isConnected = true
                    reconnectTimer?.cancel()
                    reconnectTimer = null
                }

                override fun onMessage(websocket: WebSocket, text: String) {
                    try {
                        Log.d(TAG, "WS onMessage raw: ${text.take(300)}")
                        val obj = JSONObject(text)
                        val type = obj.optString("type")
                        Log.d(TAG, "WS onMessage type=$type chatId=${obj.optString("chat_id")}")

                        when (type) {
                            "new_message" -> {
                                val chatMsg = parseChatMessage(obj)
                                if (chatMsg != null) {
                                    val result = _channel.trySend(chatMsg)
                                    Log.d(TAG, "WS emitted: id=${chatMsg.id}, isMine=${chatMsg.safe_sender_id == null || chatMsg.sender_id.toString() == currentChatId}, sent=${result.isSuccess}, closing=${result.isClosed}")
                                } else {
                                    Log.w(TAG, "WS new_message parsed to null, skipping")
                                }
                            }
                            "packet_claimed" -> {
                                val packetId = obj.optString("packet_id").ifBlank { null }
                                val claimed = obj.optBoolean("claimed", true)
                                if (packetId != null) {
                                    val claimMsg = ChatMessage(
                                        id = 0,
                                        sender_id = 0,
                                        packet_id = packetId,
                                        claimed = claimed
                                    )
                                    val result = _channel.trySend(claimMsg)
                                    Log.d(TAG, "WS packet_claimed: packetId=$packetId, sent=${result.isSuccess}")
                                }
                            }
                            "connected" -> {
                                Log.d(TAG, "WS connected ack: userId=${obj.optString("userId")} chatId=${obj.optString("chatId")}")
                            }
                            else -> {
                                Log.d(TAG, "WS unknown type=$type")
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "WS onMessage error: ${e.message}", e)
                    }
                }

                override fun onClosed(websocket: WebSocket, code: Int, reason: String) {
                    Log.d(TAG, "WS onClosed: code=$code reason=$reason")
                    isConnected = false
                    ws = null
                    if (!isDisposed) scheduleReconnect(chatId)
                }

                override fun onFailure(websocket: WebSocket, t: Throwable, response: Response?) {
                    Log.e(TAG, "WS onFailure: ${t.message}, response=${response?.code ?: "null"}", t)
                    isConnected = false
                    ws = null
                    if (!isDisposed) scheduleReconnect(chatId)
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "doConnect error: ${e.message}", e)
            isConnected = false
            if (!isDisposed) scheduleReconnect(chatId)
        }
    }

    private fun parseChatMessage(obj: JSONObject): ChatMessage? {
        return runCatching {
            val idStr = obj.optString("id")
            val id = idStr.toIntOrNull() ?: return null
            val senderIdStr = obj.optString("sender_id")
            val senderId = senderIdStr.toIntOrNull()
            val senderName = obj.optString("sender_name").ifBlank { null }
                ?: obj.optString("senderUsername").ifBlank { null }
            val content = obj.optString("content").ifBlank { null }
            val imageUrl = obj.optString("image_url").ifBlank { null }
            val createdAt = obj.optString("created_at").ifBlank { null }
            val rawPacketId = obj.opt("packet_id")
            val packetId: String? = when {
                rawPacketId == null -> null
                rawPacketId is String -> rawPacketId.takeIf { it.isNotBlank() && it != "null" }
                    ?: obj.optString("redPacketId").takeIf { it.isNotBlank() && it != "null" }
                else -> null
            }
            val claimed = obj.optBoolean("claimed", false) || obj.optBoolean("isClaimed", false)

            if (content == null && imageUrl == null) {
                Log.d(TAG, "parseChatMessage: no content, skipping")
                return null
            }

            ChatMessage(
                id = id,
                sender_id = senderId ?: 0,
                sender_name = senderName,
                content = content,
                image_url = imageUrl,
                created_at = createdAt,
                is_mine = false,
                safe_sender_id = senderId,
                packet_id = packetId,
                claimed = claimed
            )
        }.getOrElse { e ->
            Log.e(TAG, "parseChatMessage failed: ${e.message}", e)
            null
        }
    }

    private fun scheduleReconnect(chatId: String) {
        if (isDisposed) return
        reconnectTimer?.cancel()
        reconnectTimer = java.util.Timer("ws-reconnect", true).apply {
            schedule(object : java.util.TimerTask() {
                override fun run() {
                    if (!isDisposed && currentChatId == chatId) {
                        Log.d(TAG, "WS reconnecting to $chatId")
                        doConnect(chatId)
                    }
                }
            }, RECONNECT_DELAY_MS)
        }
    }

    fun send(content: String) {
        val msg = JSONObject().apply {
            put("type", "chat_message")
            put("content", content)
        }
        val sent = ws?.send(msg.toString()) ?: false
        Log.d(TAG, "WS send: success=$sent")
    }

    fun disconnect() {
        isDisposed = true
        isConnected = false
        reconnectTimer?.cancel()
        reconnectTimer = null
        try { ws?.close(1000, "disconnect") } catch (_: Exception) {}
        ws = null
        currentChatId = null
        Log.d(TAG, "disconnected")
    }
}
