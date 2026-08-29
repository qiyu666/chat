package com.chat.app.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chat.app.chatContainer
import com.chat.app.ui.chats.ChatDetailScreen
import com.chat.app.ui.chats.ChatListScreen
import com.chat.app.ui.contacts.ContactsScreen
import com.chat.app.ui.moments.MomentsScreen
import com.chat.app.ui.profile.ProfileScreen
import com.chat.app.util.NotificationHelper
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class HomeTab(val label: String, val icon: ImageVector) {
    Chats("消息", Icons.Default.Forum),
    Contacts("联系人", Icons.Default.People),
    Moments("朋友圈", Icons.Default.Star), // v1.2.0
    Profile("我", Icons.Default.Person)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScaffold(onLogout: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as android.app.Application
    val container = app.chatContainer
    val user by container.userFlow.collectAsStateWithLifecycle(initialValue = null)
    var selectedTab by remember { mutableStateOf(HomeTab.Chats) }
    var openChatId by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // 简易轮询：每 12 秒拉一次新会话列表，如果有未读弹通知
    LaunchedEffect(Unit) {
        var lastUnreadTotals = 0
        while (true) {
            runCatching {
                val chats = container.api.getChats().body().orEmpty()
                val unread = chats.sumOf { it.unread }
                if (unread > lastUnreadTotals && lastUnreadTotals > 0) {
                    val newCount = unread - lastUnreadTotals
                    val top = chats.firstOrNull { it.unread > 0 }
                    if (top != null) {
                        NotificationHelper.show(
                            app,
                            "${top.name ?: "未知"} 发来${if (newCount > 1) " $newCount 条" else ""}消息",
                            top.last_message ?: "点击查看"
                        )
                    }
                }
                lastUnreadTotals = unread
            }
            delay(12_000L)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp,
                modifier = Modifier.height(72.dp)
            ) {
                HomeTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.label,
                                modifier = Modifier.size(26.dp)
                            )
                        },
                        label = {
                            Text(
                                text = tab.label,
                                style = MaterialTheme.typography.labelSmall
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(Modifier.padding(innerPadding)) {
            if (openChatId != null) {
                ChatDetailScreen(
                    chatId = openChatId!!,
                    onBack = { openChatId = null },
                    onSnack = { scope.launch { snackbarHostState.showSnackbar(it) } }
                )
            } else {
                when (selectedTab) {
                    HomeTab.Chats -> ChatListScreen(onSnack = {
                        scope.launch { snackbarHostState.showSnackbar(it) }
                    })
                    HomeTab.Contacts -> ContactsScreen(
                        onContactClick = { chatId ->
                            openChatId = chatId
                        }
                    )
                    HomeTab.Moments -> MomentsScreen()
                    HomeTab.Profile -> ProfileScreen(
                        user = user,
                        onLogout = onLogout,
                        onSnack = { scope.launch { snackbarHostState.showSnackbar(it) } }
                    )
                }
            }
        }
    }
}
