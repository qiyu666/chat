package com.chat.app.data.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.chat.app.data.api.ChatApi
import com.chat.app.data.model.StringOrListJsonAdapterFactory
import com.chat.app.data.model.User
import com.chat.app.data.model.UserJsonAdapterFactory
import com.chat.app.data.websocket.WebSocketManager
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
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

    private val _scope = CoroutineScope(Dispatchers.IO)

    val moshi: Moshi by lazy {
        Moshi.Builder()
            .add(StringOrListJsonAdapterFactory())
            .add(UserJsonAdapterFactory())
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
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .callTimeout(15, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()
    }

    fun createWebSocketManager(token: String): WebSocketManager =
        WebSocketManager(API_BASE.removeSuffix("/"), token)

    val api: ChatApi by lazy {
        Retrofit.Builder()
            .baseUrl(API_BASE)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(ChatApi::class.java)
    }

    // ---- Token / User 持久化 ----
    // 使用 stateIn 将冷流转为热流，首次订阅立即返回 DataStore 中缓存的最新值，
    // 避免 collectAsStateWithLifecycle 因初始 null 发射而缓存错误状态。
    val tokenFlow: Flow<String?> = context.dataStore.data
        .map { it[KEY_TOKEN] }
        .stateIn(_scope, started = kotlinx.coroutines.flow.SharingStarted.Eagerly, initialValue = null)

    val userFlow: Flow<User?> = context.dataStore.data
        .map { prefs ->
            prefs[KEY_USER_JSON]?.let { json ->
                runCatching {
                    moshi.adapter(User::class.java).fromJson(json)
                }.getOrNull()
            }
        }
        .stateIn(_scope, started = kotlinx.coroutines.flow.SharingStarted.Eagerly, initialValue = null)

    /**
     * 显式触发 DataStore 初始化，在 UI 观察 tokenFlow/userFlow 之前调用，
     * 确保 preferences 文件已创建，避免 lazily backed DataStore 在首次访问时
     * 因 IO 线程尚未就绪而读取到空值导致登录态丢失。
     * 此方法必须在主线程由 lifecycleScope 调用（而非直接在 onCreate 中同步调用）。
     */
    suspend fun initDataStore() {
        try {
            val prefs = context.dataStore.data.first()
            android.util.Log.d("AppContainer", "DataStore initialized: hasToken=${!prefs[KEY_TOKEN].isNullOrBlank()}")
        } catch (e: Exception) {
            android.util.Log.e("AppContainer", "DataStore init failed: ${e.message}", e)
        }
    }

    suspend fun saveAuth(token: String, user: User) {
        context.dataStore.edit { prefs ->
            prefs[KEY_TOKEN] = token
            prefs[KEY_USER_JSON] = moshi.adapter(User::class.java).toJson(user)
        }
        android.util.Log.d("AppContainer", "saveAuth: token saved (${token.take(8)}...)")
    }

    suspend fun clearAuth() {
        context.dataStore.edit { prefs ->
            prefs.remove(KEY_TOKEN)
            prefs.remove(KEY_USER_JSON)
        }
        android.util.Log.d("AppContainer", "clearAuth: token cleared")
    }

    suspend fun currentToken(): String? = tokenFlow.first()
    suspend fun currentUser(): User? = userFlow.first()
}
