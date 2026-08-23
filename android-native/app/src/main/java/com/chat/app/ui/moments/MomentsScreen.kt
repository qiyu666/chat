package com.chat.app.ui.moments

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Grade
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.chat.app.ui.chats.EmptyState

@Composable
fun MomentsScreen() {
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = {
                Text(
                    text = "朋友圈",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.background
            )
        )
        EmptyState(
            icon = Icons.Default.Grade,
            title = "朋友圈模块开发中",
            subtitle = "下一期将支持发动态、图片上传、点赞互动"
        )
    }
}
