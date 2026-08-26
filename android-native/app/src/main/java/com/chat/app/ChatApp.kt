package com.chat.app

import android.app.Application
import com.chat.app.data.di.AppContainer
import com.chat.app.util.NotificationHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ChatApp : Application() {
    lateinit var container: AppContainer
        private set

    // 在 Application 层级持有顶层协程作用域，避免依赖 Activity 生命周期
    private val scope = CoroutineScope(Dispatchers.Main)

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(applicationContext)
        // 强制初始化 DataStore，确保在 UI 观察 tokenFlow 之前 preferences 文件已创建，
        // 避免 lazily backed 属性在首次读取时尚未完成同步导致的登录态丢失。
        scope.launch { container.initDataStore() }
        NotificationHelper.createChannel(applicationContext)
    }
}

val Application.chatContainer: AppContainer
    get() = (this as ChatApp).container
