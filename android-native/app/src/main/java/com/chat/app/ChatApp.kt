package com.chat.app

import android.app.Application
import com.chat.app.data.di.AppContainer
import com.chat.app.util.NotificationHelper

class ChatApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(applicationContext)
        NotificationHelper.createChannel(applicationContext)
    }
}

val Application.chatContainer: AppContainer
    get() = (this as ChatApp).container
