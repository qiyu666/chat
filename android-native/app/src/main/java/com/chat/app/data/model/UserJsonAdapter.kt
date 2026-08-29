package com.chat.app.data.model

import com.squareup.moshi.*
import java.lang.reflect.ParameterizedType
import java.lang.reflect.Type

class UserJsonAdapterFactory : JsonAdapter.Factory {
    override fun create(
        type: Type,
        annotations: Set<Annotation>,
        moshi: Moshi
    ): JsonAdapter<*>? {
        if (annotations.isNotEmpty()) return null
        val rawType = when {
            type is ParameterizedType -> type.rawType
            else -> type
        }
        if (rawType !== User::class.java) return null
        return UserJsonAdapter()
    }
}

class UserJsonAdapter : JsonAdapter<User>() {
    override fun fromJson(reader: JsonReader): User? {
        if (reader.peek() == JsonReader.Token.NULL) {
            reader.nextNull<Any>()
            return null
        }
        reader.beginObject()
        var id: String? = null
        var username: String? = null
        var chatCode: String? = null
        var avatarUrl: String? = null
        while (reader.hasNext()) {
            val name = reader.nextName()
            when (name) {
                "id" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else id = reader.nextString()
                    android.util.Log.d("UserJsonAdapter", "parsed id='$id'")
                }
                "username" -> {
                    username = reader.nextString()
                    android.util.Log.d("UserJsonAdapter", "parsed username='$username'")
                }
                "chat_code", "chatCode" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else chatCode = reader.nextString()
                }
                "avatar_url", "avatarUrl" -> {
                    if (reader.peek() == JsonReader.Token.NULL) reader.nextNull<Any>()
                    else avatarUrl = reader.nextString()
                }
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        val user = if (id != null && username != null) User(id, username, chatCode, avatarUrl) else null
        android.util.Log.d("UserJsonAdapter", "user result: id=$id, username=$username, user=${user != null}")
        return user
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
