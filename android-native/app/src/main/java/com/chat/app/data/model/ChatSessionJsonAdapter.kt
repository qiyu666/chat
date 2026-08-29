package com.chat.app.data.model

import com.squareup.moshi.*
import java.lang.reflect.ParameterizedType
import java.lang.reflect.Type

class ChatSessionJsonAdapterFactory : JsonAdapter.Factory {
    override fun create(type: Type, annotations: Set<Annotation>, moshi: Moshi): JsonAdapter<*>? {
        if (annotations.isNotEmpty()) return null
        val rawType = when {
            type is ParameterizedType -> type.rawType
            else -> type
        }
        if (rawType !== ChatSession::class.java) return null
        return ChatSessionJsonAdapter()
    }
}

class ChatSessionJsonAdapter : JsonAdapter<ChatSession>() {
    override fun fromJson(reader: JsonReader): ChatSession? {
        if (reader.peek() == JsonReader.Token.NULL) {
            reader.nextNull<Any>()
            return null
        }
        reader.beginObject()
        var id: String? = null
        var name: String? = null
        var avatar: String? = null
        var lastMessage: String? = null
        var lastAt: String? = null
        var unread: Int = 0
        var friendId: String? = null
        while (reader.hasNext()) {
            val fieldName = reader.nextName()
            when (fieldName) {
                "id" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else id = reader.nextString()
                }
                "name" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else name = reader.nextString()
                }
                "avatar", "avatar_url" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else avatar = reader.nextString()
                }
                "last_message", "lastMessage" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else lastMessage = reader.nextString()
                }
                "last_at", "lastAt", "created_at" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else lastAt = reader.nextString()
                }
                "unread" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else unread = reader.nextInt()
                }
                "friend_id", "friendId", "user1_id", "user2_id" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else friendId = reader.nextString()
                }
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        if (id != null) {
            return ChatSession(
                id = id,
                name = name,
                avatar = avatar,
                last_message = lastMessage,
                last_at = lastAt,
                unread = unread,
                friend_id_raw = friendId
            )
        }
        return null
    }

    override fun toJson(writer: JsonWriter, value: ChatSession?) {
        if (value == null) { writer.nullValue(); return }
        val delegate = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build().adapter(ChatSession::class.java)
        delegate.toJson(writer, value)
    }
}
