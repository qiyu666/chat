package com.chat.app.data.model

import com.squareup.moshi.*
import java.lang.reflect.Type

/**
 * 兼容旧版数据：后端 user.id 可能是整数（1787...）或字符串（"id_xxx"）。
 * 统一转换成 String。
 */
class UserJsonAdapterFactory : JsonAdapter.Factory {
    override fun create(
        type: Type,
        annotations: Set<Annotation>,
        moshi: Moshi
    ): JsonAdapter<*>? {
        if (type != User::class.java) return null
        if (annotations.isNotEmpty()) return null
        return UserJsonAdapter()
    }
}

class UserJsonAdapter : JsonAdapter<User>() {
    override fun fromJson(reader: JsonReader): User? {
        if (reader.peek() == JsonReader.Token.NULL) {
            reader.nextNull<String>()
            return null
        }
        reader.beginObject()
        var id: Int? = null
        var username: String? = null
        var chatCode: String? = null
        var avatarUrl: String? = null
        while (reader.hasNext()) {
            val name = reader.nextName()
            when (name) {
                "id" -> {
                    if (reader.peek() == JsonReader.Token.NUMBER) {
                        id = reader.nextInt()
                    } else {
                        id = reader.nextString().toIntOrNull()
                    }
                }
                "username" -> username = reader.nextString()
                "chat_code" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<String>()
                    else chatCode = reader.nextString()
                }
                "avatar_url" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<String>()
                    else avatarUrl = reader.nextString()
                }
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        return if (id != null && username != null) User(id, username, chatCode, avatarUrl) else null
    }

    override fun toJson(writer: JsonWriter, value: User?) {
        if (value == null) {
            writer.nullValue()
            return
        }
        writer.beginObject()
        writer.name("id").value(value.id)
        writer.name("username").value(value.username)
        writer.name("chat_code")
        if (value.chat_code == null) writer.nullValue()
        else writer.value(value.chat_code)
        writer.name("avatar_url")
        if (value.avatar_url == null) writer.nullValue()
        else writer.value(value.avatar_url)
        writer.endObject()
    }
}
