package com.chat.app.data.model

import com.squareup.moshi.*
import java.lang.reflect.ParameterizedType
import java.lang.reflect.Type

// NOTE: intentionally no @JsonClass - custom adapter handles all format variations
data class MessagesResponse(val messages: List<ChatMessage> = emptyList())

class MessagesResponseJsonAdapterFactory : JsonAdapter.Factory {
    override fun create(type: Type, annotations: Set<Annotation>, moshi: Moshi): JsonAdapter<*>? {
        if (annotations.isNotEmpty()) return null
        // Support both Class and ParameterizedType (handles Kotlin generic erasure)
        val rawType = when {
            type is ParameterizedType -> type.rawType
            else -> type
        }
        if (rawType !== MessagesResponse::class.java) return null
        return MessagesResponseJsonAdapter(moshi)
    }
}

class MessagesResponseJsonAdapter(private val moshi: Moshi) : JsonAdapter<MessagesResponse>() {
    override fun fromJson(reader: JsonReader): MessagesResponse? {
        if (reader.peek() == JsonReader.Token.NULL) {
            reader.nextNull<Any>()
            return null
        }
        reader.beginObject()
        var messages = emptyList<ChatMessage>()
        while (reader.hasNext()) {
            val name = reader.nextName()
            if (name == "messages") {
                messages = readMessagesArray(reader)
            } else {
                reader.skipValue()
            }
        }
        reader.endObject()
        return MessagesResponse(messages)
    }

    private fun readMessagesArray(reader: JsonReader): List<ChatMessage> {
        if (reader.peek() == JsonReader.Token.NULL) {
            reader.nextNull<Any>()
            return emptyList()
        }
        if (reader.peek() == JsonReader.Token.BEGIN_ARRAY) {
            return parseMessagesArray(reader)
        }
        // Not an array - try to parse as single object
        return listOfNotNull(parseSingleMessage(reader))
    }

    private fun parseMessagesArray(reader: JsonReader): List<ChatMessage> {
        reader.beginArray()
        val result = mutableListOf<ChatMessage>()
        while (reader.hasNext()) {
            result.add(parseSingleMessage(reader) ?: continue)
        }
        reader.endArray()
        return result
    }

    private fun parseSingleMessage(reader: JsonReader): ChatMessage? {
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
            val name = reader.nextName()
            when (name) {
                "id" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else id = reader.nextString()
                }
                "sender_id", "safe_sender_id" -> {
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
                "safe_sender_id" -> {
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
        return ChatMessage(
            id = id ?: "",
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

    override fun toJson(writer: JsonWriter, value: MessagesResponse?) {
        if (value == null) { writer.nullValue(); return }
        writer.beginObject()
        writer.name("messages")
        writer.beginArray()
        for (msg in value.messages) {
            writer.beginObject()
            writer.name("id").value(msg.id)
            writer.name("sender_id").value(msg.sender_id)
            writer.name("sender_name").value(msg.sender_name)
            writer.name("content").value(msg.content)
            writer.name("image_url").value(msg.image_url)
            writer.name("created_at").value(msg.created_at)
            writer.name("is_mine").value(msg.is_mine)
            writer.name("safe_sender_id").value(msg.safe_sender_id)
            writer.name("packet_id").value(msg.packet_id)
            writer.name("claimed").value(msg.claimed)
            writer.endObject()
        }
        writer.endArray()
        writer.endObject()
    }
}
