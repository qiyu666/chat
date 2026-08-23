package com.chat.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import com.chat.app.data.model.Balance
import com.chat.app.data.model.Transaction
import com.chat.app.data.model.TransactionPage
import com.chat.app.data.model.User
import com.chat.app.ui.chats.EmptyState
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    user: User?,
    onLogout: () -> Unit,
    onSnack: (String) -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as android.app.Application
    val container = app.chatContainer
    val scope = rememberCoroutineScope()

    var balance by remember { mutableStateOf(Balance("0.00")) }
    var page by remember { mutableStateOf(TransactionPage(emptyList(), 1, 0)) }
    var loadingBalance by remember { mutableStateOf(true) }
    var loadingTx by remember { mutableStateOf(true) }
    var showTxDetail by remember { mutableStateOf(false) }

    suspend fun loadAll() {
        loadingBalance = true; loadingTx = true
        runCatching { container.api.getBalance().body() ?: Balance("0.00") }
            .onSuccess { balance = it }.onFailure { onSnack(it.message ?: "余额加载失败") }
        loadingBalance = false
        runCatching { container.api.getTransactions(1).body() ?: TransactionPage(emptyList(), 1, 0) }
            .onSuccess { page = it }.onFailure { onSnack(it.message ?: "记录加载失败") }
        loadingTx = false
    }

    LaunchedEffect(Unit) { loadAll() }

    if (showTxDetail) {
        TransactionDetailPage(page = page, onBack = { showTxDetail = false })
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // -------- 顶部用户卡片 --------
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(20.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        if (user?.avatar_url.isNullOrBlank()) {
                            Text(
                                text = user?.username?.take(1)?.uppercase() ?: "?",
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.Bold,
                                fontSize = 26.sp
                            )
                        } else {
                            AsyncImage(
                                model = user!!.avatar_url,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = user?.nickname ?: user?.username ?: "未登录用户",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(Modifier.height(4.dp))
                        if (user?.chat_code != null) {
                            AssistChip(
                                onClick = {  },
                                label = {
                                    Text(
                                        text = "聊号码: ${user.chat_code}",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Numbers, contentDescription = null, modifier = Modifier.size(16.dp))
                                }
                            )
                        }
                    }
                }
            }
        }

        // -------- 余额卡片 --------
        item {
            Row(Modifier.padding(horizontal = 20.dp)) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            androidx.compose.ui.graphics.Brush.linearGradient(
                                listOf(
                                    MaterialTheme.colorScheme.primary,
                                    MaterialTheme.colorScheme.primaryContainer
                                )
                            )
                        )
                        .padding(20.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("钱包余额", color = Color.White, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(Modifier.height(10.dp))
                    if (loadingBalance) {
                        Box(Modifier.height(40.dp), contentAlignment = Alignment.CenterStart) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        }
                    } else {
                        Text(
                            text = "¥ ${balance.balance}",
                            color = Color.White,
                            style = MaterialTheme.typography.displayLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AssistChip(
                            onClick = { showTxDetail = true },
                            label = { Text("交易明细", color = MaterialTheme.colorScheme.primary) },
                            colors = AssistChipDefaults.assistChipColors(containerColor = Color.White.copy(alpha = 0.95f))
                        )
                        AssistChip(
                            onClick = { onSnack("开发中：下一期支持发红包") },
                            label = { Text("发红包", color = MaterialTheme.colorScheme.primary) },
                            colors = AssistChipDefaults.assistChipColors(containerColor = Color.White.copy(alpha = 0.95f)),
                            leadingIcon = { Icon(Icons.Default.CardGiftcard, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary) }
                        )
                        AssistChip(
                            onClick = { onSnack("开发中：下一期支持转账") },
                            label = { Text("转账", color = MaterialTheme.colorScheme.primary) },
                            colors = AssistChipDefaults.assistChipColors(containerColor = Color.White.copy(alpha = 0.95f)),
                            leadingIcon = { Icon(Icons.Default.SwapHoriz, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary) }
                        )
                    }
                }
            }
        }

        // -------- 设置项 --------
        item { Spacer(Modifier.height(20.dp)) }
        item {
            SettingRow(icon = Icons.Default.History, label = "交易记录", desc = "查看全部收支明细", onClick = { showTxDetail = true })
        }
        item {
            SettingRow(icon = Icons.Default.Lock, label = "修改支付密码", desc = "钱包安全保护", onClick = { onSnack("下一期支持") })
        }
        item {
            SettingRow(icon = Icons.Default.Password, label = "修改账号密码", desc = "", onClick = { onSnack("下一期支持") })
        }
        item {
            SettingRow(icon = Icons.Default.Refresh, label = "刷新数据", desc = "", onClick = { scope.launch { loadAll() } })
        }
        item { Spacer(Modifier.height(12.dp)) }
        item {
            Row(Modifier.padding(horizontal = 20.dp)) {
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("退出登录", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun SettingRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    desc: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                if (desc.isNotBlank()) {
                    Text(desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    HorizontalDivider(
        modifier = Modifier.padding(start = 74.dp, end = 20.dp),
        color = MaterialTheme.colorScheme.outlineVariant
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TransactionDetailPage(page: TransactionPage, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("交易明细", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "返回") }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
        )
        if (page.items.isEmpty()) {
            EmptyState(icon = Icons.Default.ReceiptLong, title = "暂无交易", subtitle = "发生的红包、转账等会出现在这里")
        } else {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(12.dp)) {
                items(page.items, key = { it.id }) { tx -> TransactionRow(tx = tx) }
            }
        }
    }
}

@Composable
private fun TransactionRow(tx: Transaction) {
    val isIn = !tx.amount.startsWith("-")
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(if (isIn) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (isIn) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                contentDescription = null,
                tint = if (isIn) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = tx.typeLabel(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = tx.counterparty?.let { "与 $it" } ?: tx.created_at.take(19).replace("T", " "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Text(
            text = if (isIn) "+ ¥${tx.amount}" else "- ¥${tx.amount}",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = if (isIn) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
        )
    }
    Spacer(Modifier.height(6.dp))
}

private fun Transaction.typeLabel(): String = when {
    type.contains("redpacket", ignoreCase = true) || type.contains("红包") -> "红包"
    type.contains("transfer", ignoreCase = true) || type.contains("转账") -> "转账"
    else -> type
}
