package com.chat.app.ui.chats

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.chat.app.chatContainer
import com.chat.app.data.model.ChatMessage
import com.chat.app.data.model.SendMessageRequest
import kotlinx.coroutines.launch

@Composable
fun ChatDetailScreen(chatId: Int, onBack: () -> Unit, onSnack: (String) -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as android.app.Application
    val container = app.chatContainer
    val scope = rememberCoroutineScope()
    var messages by remember { mutableStateOf<List<ChatMessage>>(emptyList()) }
    var input by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    val listState = rememberLazyListState()
    val user by container.userFlow.collectAsStateWithLifecycle(initialValue = null)
    val myId = user?.id

    suspend fun load() {
        loading = true
        runCatching { container.api.getMessages(chatId).body().orEmpty() }
            .onSuccess {
                messages = it
                if (it.isNotEmpty()) {
                    runCatching { listState.animateScrollToItem(it.size - 1) }
                }
            }.onFailure { onSnack(it.message ?: "加载消息失败") }
        loading = false
    }

    LaunchedEffect(chatId) { load() }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = {
                Text(
                    text = "聊天中",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.background
            )
        )

        Box(Modifier.weight(1f)) {
            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                messages.isEmpty() -> EmptyState(
                    icon = Icons.Default.ArrowBack,
                    title = "还没有消息",
                    subtitle = "输入下方内容，开启对话"
                )
                else -> LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(messages, key = { it.id }) { msg ->
                        MessageBubble(msg = msg, isMine = (myId != null && msg.sender_id == myId) || msg.is_mine == true)
                    }
                }
            }
        }

        // 输入框
        Surface(
            tonalElevation = 2.dp,
            color = MaterialTheme.colorScheme.surface
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("说点什么...", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                    maxLines = 4,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                    ),
                    shape = RoundedCornerShape(24.dp)
                )
                Spacer(Modifier.width(10.dp))
                Button(
                    onClick = {
                        val text = input.trim()
                        if (text.isBlank() || sending) return@Button
                        scope.launch {
                            sending = true
                            runCatching { container.api.sendMessage(chatId, SendMessageRequest(content = text, imageUrl = null)).body() }
                                .onSuccess { input = ""; load() }
                                .onFailure { onSnack(it.message ?: "发送失败") }
                            sending = false
                        }
                    },
                    enabled = !sending,
                    modifier = Modifier.size(50.dp),
                    shape = RoundedCornerShape(25.dp),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Icon(Icons.Default.Send, contentDescription = "发送")
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(msg: ChatMessage, isMine: Boolean) {
    val bubbleColor: Color
    val textColor: Color
    val alignment: Alignment.Horizontal
    val shape: RoundedCornerShape

    if (isMine) {
        bubbleColor = MaterialTheme.colorScheme.primary
        textColor = MaterialTheme.colorScheme.onPrimary
        alignment = Alignment.End
        shape = RoundedCornerShape(topStart = 18.dp, topEnd = 6.dp, bottomStart = 18.dp, bottomEnd = 18.dp)
    } else {
        bubbleColor = MaterialTheme.colorScheme.surfaceVariant
        textColor = MaterialTheme.colorScheme.onSurface
        alignment = Alignment.Start
        shape = RoundedCornerShape(topStart = 6.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 18.dp)
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = alignment
    ) {
        if (!isMine && msg.sender_name != null) {
            Text(
                text = msg.sender_name!!,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 8.dp, bottom = 2.dp)
            )
        }
        Column(
            modifier = Modifier
                .widthIn(max = 300.dp)
                .clip(shape)
                .background(bubbleColor)
                .padding(12.dp)
        ) {
            if (!msg.image_url.isNullOrBlank()) {
                AsyncImage(
                    model = msg.image_url,
                    contentDescription = null,
                    contentScale = ContentScale.FillWidth,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                )
                if (!msg.content.isNullOrBlank()) Spacer(Modifier.height(6.dp))
            }
            if (!msg.content.isNullOrBlank()) {
                Text(
                    text = msg.content!!,
                    color = textColor,
                    style = MaterialTheme.typography.bodyLarge,
                    fontSize = 15.sp,
                    lineHeight = 20.sp
                )
            }
        }
        Text(
            text = msg.created_at.take(16).replace("T", " "),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
            modifier = Modifier.padding(
                top = 4.dp,
                start = if (isMine) 0.dp else 8.dp,
                end = if (isMine) 8.dp else 0.dp
            )
        )
    }
}
