package com.chat.app.data.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.chat.app.data.api.ChatApi
import com.chat.app.data.model.User
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "chat_prefs")

/**
 * 手动注入容器：MVP 规模不需要 Hilt，用单例对象即可。
 * 所有 Retrofit / DataStore 实例都放在这里。
 */
class AppContainer(private val context: Context) {

    companion object {
        private const val API_BASE = "https://chat-api.aiit.cc.cd/api/"
        private val KEY_TOKEN = stringPreferencesKey("auth_token")
        private val KEY_USER_JSON = stringPreferencesKey("auth_user_json")
    }

    private val moshi: Moshi by lazy {
        Moshi.Builder()
            .addLast(KotlinJsonAdapterFactory())
            .build()
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val token = runBlocking { currentToken() }
        val builder = original.newBuilder()
            .header("Content-Type", "application/json")
        if (!token.isNullOrBlank()) {
            builder.header("Authorization", "Bearer $token")
        }
        chain.proceed(builder.build())
    }

    private val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()
    }

    val api: ChatApi by lazy {
        Retrofit.Builder()
            .baseUrl(API_BASE)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(ChatApi::class.java)
    }

    // ---- Token / User 持久化 ----
    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[KEY_TOKEN] }

    val userFlow: Flow<User?> = context.dataStore.data.map { prefs ->
        prefs[KEY_USER_JSON]?.let { json ->
            runCatching {
                moshi.adapter(User::class.java).fromJson(json)
            }.getOrNull()
        }
    }

    suspend fun saveAuth(token: String, user: User) {
        val userJson = moshi.adapter(User::class.java).toJson(user)
        context.dataStore.edit {
            it[KEY_TOKEN] = token
            it[KEY_USER_JSON] = userJson
        }
    }

    suspend fun clearAuth() {
        context.dataStore.edit {
            it.remove(KEY_TOKEN)
            it.remove(KEY_USER_JSON)
        }
    }

    suspend fun currentToken(): String? = tokenFlow.first()
    suspend fun currentUser(): User? = userFlow.first()
}
