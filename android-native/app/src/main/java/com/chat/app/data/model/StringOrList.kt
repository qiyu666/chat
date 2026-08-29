package com.chat.app.data.model

import com.squareup.moshi.*
import java.lang.reflect.ParameterizedType
import java.lang.reflect.Type

data class StringOrList(val value: List<String>) {
    val size: Int get() = value.size
    fun isEmpty() = value.isEmpty()
    fun isNullOrEmpty() = value.isEmpty()
    operator fun get(index: Int) = value[index]
}

class StringOrListJsonAdapterFactory : JsonAdapter.Factory {
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
        if (rawType !== StringOrList::class.java) return null
        return StringOrListJsonAdapter()
    }
}

class StringOrListJsonAdapter : JsonAdapter<StringOrList>() {
    override fun fromJson(reader: JsonReader): StringOrList? {
        if (reader.peek() == JsonReader.Token.NULL) {
            reader.nextNull<String>()
            return null
        }
        return when (reader.peek()) {
            JsonReader.Token.STRING -> StringOrList(listOf(reader.nextString()))
            JsonReader.Token.BEGIN_ARRAY -> {
                val list = mutableListOf<String>()
                reader.beginArray()
                while (reader.hasNext()) list.add(reader.nextString())
                reader.endArray()
                StringOrList(list)
            }
            else -> {
                reader.skipValue()
                return null
            }
        }
    }

    override fun toJson(writer: JsonWriter, value: StringOrList?) {
        writer.beginArray()
        value?.value?.forEach { writer.value(it) }
        writer.endArray()
    }
}
