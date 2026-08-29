package com.chat.app.data.model

import com.squareup.moshi.*
import java.lang.reflect.ParameterizedType
import java.lang.reflect.Type

class ChatMessageJsonAdapterFactory : JsonAdapter.Factory {
    override fun create(type: Type, annotations: Set<Annotation>, moshi: Moshi): JsonAdapter<*>? {
        if (annotations.isNotEmpty()) return null
        val rawType = when {
            type is ParameterizedType -> type.rawType
            else -> type
        }
        if (rawType !== ChatMessage::class.java) return null
        return ChatMessageJsonAdapter()
    }
}

class ChatMessageJsonAdapter : JsonAdapter<ChatMessage>() {
    override fun fromJson(reader: JsonReader): ChatMessage? {
        if (reader.peek() == JsonReader.Token.NULL) {
            reader.nextNull<Any>()
            return null
        }
        reader.beginObject()
        var id: String? = null
        var senderId: String? = null
        var senderName: String? = null
        var content: String? = null
        var imageUrl: String? = null
        var createdAt: String? = null
        var isMine: Boolean? = null
        var safeSenderId: String? = null
        var packetId: String? = null
        var claimed: Boolean? = null
        while (reader.hasNext()) {
            val fieldName = reader.nextName()
            when (fieldName) {
                "id" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else id = reader.nextString()
                }
                "sender_id" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else senderId = reader.nextString()
                }
                "sender_name", "senderUsername" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else senderName = reader.nextString()
                }
                "content" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else content = reader.nextString()
                }
                "image_url", "imageUrl" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else imageUrl = reader.nextString()
                }
                "created_at", "createdAt" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else createdAt = reader.nextString()
                }
                "is_mine", "isMine" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else isMine = reader.nextBoolean()
                }
                "safe_sender_id", "safeSenderId" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else safeSenderId = reader.nextString()
                }
                "packet_id", "packetId", "redPacketId" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else packetId = reader.nextString()
                }
                "claimed" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else claimed = reader.nextInt() != 0
                }
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        if (id != null) {
            return ChatMessage(
                id = id,
                sender_id = senderId,
                sender_name = senderName,
                content = content,
                image_url = imageUrl,
                created_at = createdAt,
                is_mine = isMine,
                safe_sender_id = safeSenderId,
                packet_id = packetId,
                claimed = claimed
            )
        }
        return null
    }

    override fun toJson(writer: JsonWriter, value: ChatMessage?) {
        if (value == null) { writer.nullValue(); return }
        val delegate = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build().adapter(ChatMessage::class.java)
        delegate.toJson(writer, value)
    }
}
