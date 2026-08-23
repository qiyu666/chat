package com.chat.app.ui.moments

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.dialog.Dialog
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.chat.app.chatContainer
import com.chat.app.data.model.Moment
import com.chat.app.data.model.MomentComment
import com.chat.app.data.model.User
import com.chat.app.ui.chats.EmptyState
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MomentsScreen(viewModel: MomentViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    val comments by viewModel.comments.collectAsState()
    val expandedIds by viewModel.expandedIds.collectAsState()
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as android.app.Application
    val container = app.chatContainer
    val currentUser = remember { mutableStateOf<User?>(null) }

    LaunchedEffect(Unit) {
        currentUser.value = container.currentUser()
        viewModel.refresh()
    }

    var showPostDialog by remember { mutableStateOf(false) }
    var selectedImages by remember { mutableStateOf<List<String>>(emptyList()) }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        if (uris.isNotEmpty()) {
            selectedImages = uris.map { it.toString() }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "朋友圈",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                actions = {
                    if (currentUser.value != null) {
                        IconButton(onClick = { showPostDialog = true }) {
                            Icon(Icons.Default.Add, contentDescription = "发动态")
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            if (currentUser.value != null) {
                FloatingActionButton(
                    onClick = { showPostDialog = true },
                    containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(Icons.Default.Add, contentDescription = "发动态")
                }
            }
        }
    ) { padding ->
        if (uiState.loading && uiState.moments.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (uiState.error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(uiState.error!!, color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = { viewModel.refresh() }) { Text("重试") }
                }
            }
        } else if (uiState.moments.isEmpty()) {
            EmptyState(
                icon = Icons.Default.Feed,
                title = "还没有动态",
                subtitle = "点击右下角按钮发布第一条朋友圈"
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.moments, key = { it.id }) { moment ->
                    MomentCard(
                        moment = moment,
                        isMine = moment.user_id == currentUser.value?.id?.toString(),
                        liked = moment.liked,
                        likeCount = moment.like_count,
                        commentCount = moment.comment_count,
                        comments = comments[moment.id] ?: emptyList(),
                        isExpanded = expandedIds.contains(moment.id),
                        onToggleLike = { viewModel.toggleLike(moment) },
                        onDelete = { viewModel.deleteMoment(moment.id) },
                        onToggleExpand = { viewModel.toggleExpand(moment.id) },
                        onAddComment = { content -> viewModel.addComment(moment.id, content) }
                    )
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }

    if (showPostDialog) {
        PostDialog(
            onDismiss = {
                showPostDialog = false
                selectedImages = emptyList()
            },
            onSend = { content, images ->
                viewModel.createMoment(content, images)
                showPostDialog = false
                selectedImages = emptyList()
            },
            onPickImages = { imagePicker.launch("image/*") },
            images = selectedImages
        )
    }
}

@Composable
fun MomentCard(
    moment: Moment,
    isMine: Boolean,
    liked: Boolean,
    likeCount: Int,
    commentCount: Int,
    comments: List<MomentComment>,
    isExpanded: Boolean,
    onToggleLike: () -> Unit,
    onDelete: () -> Unit,
    onToggleExpand: () -> Unit,
    onAddComment: (String) -> Unit
) {
    var showCommentInput by remember { mutableStateOf(false) }
    var commentText by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current
    val timeStr = formatTimeAgo(moment.created_at)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header: avatar + name + time + delete
            Row(verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(moment.avatar_url)
                        .crossfade(true)
                        .build(),
                    placeholder = null,
                    error = null,
                    contentDescription = null,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = moment.username,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = timeStr,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (isMine) {
                    IconButton(onClick = { onDelete() }) {
                        Icon(Icons.Default.Delete, contentDescription = "删除", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            // Content
            if (moment.content.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = moment.content,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Images
            if (!moment.images.isNullOrEmpty()) {
                Spacer(Modifier.height(8.dp))
                val size = moment.images.size
                if (size == 1) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(moment.images[0])
                            .crossfade(true)
                            .build(),
                        placeholder = null,
                        error = null,
                        contentDescription = "图片",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(220.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop
                    )
                } else {
                    val cols = if (size == 4) 2 else 3
                    val rows = (size + cols - 1) / cols
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        moment.images.forEach { url ->
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(url)
                                    .crossfade(true)
                                    .build(),
                                placeholder = null,
                                error = null,
                                contentDescription = "图片",
                                modifier = Modifier
                                    .size((260.dp / cols))
                                    .clip(RoundedCornerShape(6.dp)),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop
                            )
                        }
                    }
                }
            }

            // Actions row
            Spacer(Modifier.height(8.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Like
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onToggleLike() }
                ) {
                    Icon(
                        imageVector = if (liked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "点赞",
                        tint = if (liked) Color(0xFFFF4081) else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = likeCount.toString(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(Modifier.width(16.dp))

                // Comment
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable {
                        showCommentInput = true
                        onToggleExpand()
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Comment,
                        contentDescription = "评论",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = commentCount.toString(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Comments section
            if (isExpanded && comments.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Divider(color = MaterialTheme.colorScheme.outlineVariant)
                Spacer(Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    comments.forEach { comment ->
                        CommentItem(comment = comment)
                    }
                }
            }

            // Comment input
            if (showCommentInput) {
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = commentText,
                    onValueChange = { commentText = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    placeholder = { Text("说点什么...") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions.Default.copy(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(
                        onSend = {
                            if (commentText.trim().isNotEmpty()) {
                                onAddComment(commentText.trim())
                                commentText = ""
                                focusManager.clearFocus()
                                showCommentInput = false
                            }
                        }
                    ),
                    trailingIcon = {
                        IconButton(
                            onClick = {
                                if (commentText.trim().isNotEmpty()) {
                                    onAddComment(commentText.trim())
                                    commentText = ""
                                    focusManager.clearFocus()
                                    showCommentInput = false
                                }
                            }
                        ) {
                            Icon(Icons.Default.Send, contentDescription = "发送")
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun CommentItem(comment: MomentComment) {
    Row(modifier = Modifier.fillMaxWidth()) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(comment.avatar_url)
                .crossfade(true)
                .build(),
            placeholder = null,
            error = null,
            contentDescription = null,
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
        )
        Spacer(Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = comment.username,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = comment.content,
                style = MaterialTheme.typography.bodySmall
            )
        }
        Text(
            text = formatTimeAgo(comment.created_at),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun PostDialog(
    onDismiss: () -> Unit,
    onSend: (String, List<String>) -> Unit,
    onPickImages: () -> Unit,
    images: List<String>
) {
    var content by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "发朋友圈",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                // Preview images
                if (images.isNotEmpty()) {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        images.forEach { url ->
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(url)
                                    .crossfade(true)
                                    .build(),
                                placeholder = null,
                                error = null,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(80.dp)
                                    .clip(RoundedCornerShape(6.dp))
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }

                OutlinedTextField(
                    value = content,
                    onValueChange = { content = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp),
                    placeholder = { Text("分享新鲜事...") },
                    maxLines = 4
                )

                Spacer(Modifier.height(8.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    IconButton(onClick = onPickImages) {
                        Icon(
                            Icons.Default.PhotoLibrary,
                            contentDescription = "添加图片",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    if (images.isNotEmpty()) {
                        Text(
                            text = "${images.size} 张图片",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 4.dp)
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = onDismiss) { Text("取消") }
                    Button(
                        onClick = {
                            if (content.trim().isNotEmpty() || images.isNotEmpty()) {
                                onSend(content.trim(), images)
                            }
                        },
                        enabled = content.trim().isNotEmpty() || images.isNotEmpty()
                    ) {
                        Text("发布")
                    }
                }
            }
        }
    }
}

private fun formatTimeAgo(timestamp: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = sdf.parse(timestamp) ?: return timestamp
        val now = Date()
        val diffMs = now.time - date.time
        val diffSec = diffMs / 1000
        if (diffSec < 60) return "刚刚"
        if (diffSec < 3600) return "${diffSec / 60}分钟前"
        if (diffSec < 86400) return "${diffSec / 3600}小时前"
        if (diffSec < 172800) return "昨天"
        if (diffSec < 604800) return "${diffSec / 86400}天前"
        SimpleDateFormat("MM-dd HH:mm", Locale.getDefault()).format(date)
    } catch (e: Exception) {
        timestamp
    }
}
