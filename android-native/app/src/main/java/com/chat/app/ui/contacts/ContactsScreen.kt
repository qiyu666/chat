package com.chat.app.ui.contacts

import androidx.compose.foundation.background
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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chat.app.data.model.Contact
import com.chat.app.data.model.FriendRequest
import com.chat.app.data.model.User
import com.chat.app.ui.chats.EmptyState
import kotlinx.coroutines.launch

sealed class ContactTab {
    data object Contacts : ContactTab()
    data object Requests : ContactTab()
    data object Search : ContactTab()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContactsScreen(viewModel: ContactsViewModel = viewModel(), onContactClick: (String) -> Unit = {}) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var selectedTab: ContactTab by remember { mutableStateOf(ContactTab.Contacts) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.loadContacts()
        viewModel.loadRequests()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "联系人",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    TextButton(onClick = {
                        viewModel.refresh()
                        scope.launch { snackbarHostState.showSnackbar("已刷新") }
                    }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新", tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(4.dp))
                        Text("刷新", color = MaterialTheme.colorScheme.primary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(Modifier.padding(padding)) {
            TabRow(
                selectedTabIndex = when (selectedTab) {
                    is ContactTab.Contacts -> 0
                    is ContactTab.Requests -> 1
                    is ContactTab.Search -> 2
                    else -> 0
                },
                containerColor = MaterialTheme.colorScheme.background,
                divider = {}
            ) {
                Tab(
                    selected = selectedTab is ContactTab.Contacts,
                    onClick = { selectedTab = ContactTab.Contacts },
                    text = { Text("联系人") }
                )
                Tab(
                    selected = selectedTab is ContactTab.Requests,
                    onClick = { selectedTab = ContactTab.Requests },
                    text = {
                        val countText = if (uiState.requests.isNotEmpty()) " (${uiState.requests.size})" else ""
                        Text("好友申请$countText")
                    }
                )
                Tab(
                    selected = selectedTab is ContactTab.Search,
                    onClick = { selectedTab = ContactTab.Search },
                    text = { Text("添加好友") }
                )
            }

            when (selectedTab) {
                is ContactTab.Contacts -> ContactsTab(
                    contacts = uiState.contacts,
                    isLoading = uiState.isLoading && uiState.contacts.isEmpty(),
                    error = uiState.error,
                    onDelete = { viewModel.deleteContact(it) },
                    onRefresh = { viewModel.loadContacts() },
                    onContactClick = onContactClick
                )
                is ContactTab.Requests -> RequestsTab(
                    requests = uiState.requests,
                    isLoading = uiState.isLoading && uiState.requests.isEmpty(),
                    error = uiState.error,
                    onAccept = { viewModel.acceptRequest(it) },
                    onReject = { viewModel.rejectRequest(it) },
                    onRefresh = { viewModel.loadRequests() }
                )
                is ContactTab.Search -> SearchTab(
                    viewModel = viewModel,
                    onSnack = { scope.launch { snackbarHostState.showSnackbar(it) } }
                )
                else -> ContactsTab(
                    contacts = emptyList(), isLoading = false, error = null,
                    onDelete = {}, onRefresh = {}, onContactClick = {}
                )
            }
        }
    }
}

@Composable
private fun ContactsTab(
    contacts: List<Contact>,
    isLoading: Boolean,
    error: String?,
    onDelete: (Contact) -> Unit,
    onRefresh: () -> Unit,
    onContactClick: (String) -> Unit
) {
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
    } else if (error != null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error, color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(8.dp))
                Button(onClick = onRefresh) { Text("重试") }
            }
        }
    } else if (contacts.isEmpty()) {
        EmptyState(icon = Icons.Default.People, title = "还没有联系人", subtitle = "在「添加好友」标签页搜索用户添加")
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            items(contacts, key = { it.id }) { contact ->
                ContactItem(contact = contact, onDelete = { onDelete(contact) }, onContactClick = onContactClick)
            }
        }
    }
}

@Composable
private fun ContactItem(contact: Contact, onDelete: () -> Unit, onContactClick: (String) -> Unit) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("删除联系人") },
            text = { Text("确定要删除「${contact.username}」吗？") },
            confirmButton = {
                Button(
                    onClick = { showDeleteConfirm = false; onDelete() },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) { Text("删除") }
            },
            dismissButton = { TextButton(onClick = { showDeleteConfirm = false }) { Text("取消") } }
        )
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.large)
            .clickable { onContactClick(contact.chatId ?: contact.id) }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = contact.username.take(1).uppercase(),
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = contact.username,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            if (!contact.lastMessage.isNullOrBlank()) {
                Text(
                    text = contact.lastMessage!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }
        }
        IconButton(onClick = { showDeleteConfirm = true }) {
            Icon(Icons.Default.Delete, contentDescription = "删除", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    HorizontalDivider(modifier = Modifier.padding(start = 76.dp), color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
private fun RequestsTab(
    requests: List<FriendRequest>,
    isLoading: Boolean,
    error: String?,
    onAccept: (FriendRequest) -> Unit,
    onReject: (FriendRequest) -> Unit,
    onRefresh: () -> Unit
) {
    if (isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
    } else if (error != null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error, color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(8.dp))
                Button(onClick = onRefresh) { Text("重试") }
            }
        }
    } else if (requests.isEmpty()) {
        EmptyState(icon = Icons.Default.Notifications, title = "没有新申请", subtitle = "好友申请会显示在这里")
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            items(requests, key = { it.id }) { request ->
                RequestItem(request = request, onAccept = { onAccept(request) }, onReject = { onReject(request) })
            }
        }
    }
}

@Composable
private fun RequestItem(request: FriendRequest, onAccept: () -> Unit, onReject: () -> Unit) {
    var accepted by remember { mutableStateOf(false) }
    var rejected by remember { mutableStateOf(false) }

    if (accepted || rejected) return

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = request.from_username.take(1).uppercase(),
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        text = request.from_username,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    if (!request.message.isNullOrBlank()) {
                        Text(
                            text = request.message!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = request.created_at?.take(16)?.replace("T", " ") ?: "",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = { rejected = true; onReject() },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                ) {
                    Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("拒绝")
                }
                Button(
                    onClick = { accepted = true; onAccept() },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("接受")
                }
            }
        }
    }
}

@Composable
private fun SearchTab(viewModel: ContactsViewModel, onSnack: (String) -> Unit) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }
    var sentUsername by remember { mutableStateOf<String?>(null) }
    var searching by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(query) {
        if (query.length >= 2) {
            searching = true
            viewModel.searchUser(query)
            searching = false
        } else if (query.isEmpty()) {
            viewModel.searchUser("")
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp)
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("搜索用户名...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = { query = "" }) {
                        Icon(Icons.Default.Clear, contentDescription = "清除")
                    }
                }
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions.Default.copy(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = {
                if (query.trim().length >= 2) {
                    searching = true
                    viewModel.searchUser(query.trim())
                    searching = false
                }
            }),
            shape = RoundedCornerShape(24.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
            )
        )

        Spacer(Modifier.height(16.dp))

        if (searching && uiState.searchResults.isEmpty()) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("搜索中...", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else if (uiState.error != null && uiState.searchResults.isEmpty()) {
            Text(uiState.error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        } else if (uiState.searchResults.isEmpty() && query.trim().length >= 2) {
            EmptyState(icon = Icons.Default.Search, title = "未找到用户", subtitle = "请检查用户名拼写")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(uiState.searchResults, key = { it.id }) { user ->
                    UserSearchItem(
                        user = user,
                        sent = sentUsername == user.username,
                        onSendRequest = { sentUsername = user.username },
                        onConfirmSend = {
                            viewModel.sendFriendRequest(user.username, null)
                            onSnack("好友申请已发送")
                            sentUsername = null
                            query = ""
                            viewModel.searchUser("")
                        }
                    )
                }
            }
        }

        Divider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.outlineVariant)

        Text(
            text = "或通过聊号码手动添加",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 4.dp)
        )
        Spacer(Modifier.height(8.dp))
        AddByChatCodeSection(onSnack = onSnack)
    }
}

@Composable
private fun AddByChatCodeSection(onSnack: (String) -> Unit) {
    var chatCode by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    Column {
        OutlinedTextField(
            value = chatCode,
            onValueChange = { chatCode = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("输入聊号码...") },
            singleLine = true,
            shape = RoundedCornerShape(24.dp)
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = message,
            onValueChange = { message = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("附言（可选）") },
            singleLine = true,
            shape = RoundedCornerShape(24.dp)
        )
        Spacer(Modifier.height(8.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            OutlinedButton(
                onClick = { chatCode = ""; message = "" },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(20.dp)
            ) { Text("清空") }
            Button(
                onClick = {
                    if (chatCode.trim().isNotEmpty()) {
                        scope.launch { onSnack("已发送申请到聊号码: ${chatCode.trim()}") }
                        chatCode = ""
                        message = ""
                    }
                },
                enabled = chatCode.trim().isNotEmpty(),
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(20.dp)
            ) { Text("发送") }
        }
    }
}

@Composable
private fun UserSearchItem(
    user: User,
    sent: Boolean,
    onSendRequest: () -> Unit,
    onConfirmSend: () -> Unit
) {
    var showSendDialog by remember { mutableStateOf(false) }

    if (showSendDialog) {
        AlertDialog(
            onDismissRequest = { showSendDialog = false },
            title = { Text("发送好友申请", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        text = "即将向 ${user.username} 发送好友申请",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    if (user.chat_code != null) {
                        OutlinedTextField(
                            value = user.chat_code!!,
                            onValueChange = {},
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("聊号码") },
                            singleLine = true,
                            readOnly = true,
                            shape = RoundedCornerShape(12.dp)
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                }
            },
            confirmButton = {
                Button(onClick = { showSendDialog = false; onConfirmSend() }) { Text("发送") }
            },
            dismissButton = { TextButton(onClick = { showSendDialog = false }) { Text("取消") } }
        )
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.large)
            .clickable { if (!sent) showSendDialog = true }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = user.username.take(1).uppercase(),
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = user.username,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            if (user.chat_code != null) {
                Text(
                    text = "聊号码: ${user.chat_code}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        if (sent) {
            AssistChip(
                onClick = {},
                leadingIcon = { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp)) },
                label = { Text("已发送", fontSize = 12.sp) }
            )
        } else {
            Button(
                onClick = { showSendDialog = true },
                shape = RoundedCornerShape(20.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
            ) {
                Text("申请", fontSize = 13.sp)
            }
        }
    }
    HorizontalDivider(modifier = Modifier.padding(start = 72.dp), color = MaterialTheme.colorScheme.outlineVariant)
}
