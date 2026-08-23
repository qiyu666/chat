package com.chat.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// 与 Web 版暗色主题保持完全一致
private val DarkColorPalette = darkColorScheme(
    primary = Color(0xFFE94560),
    onPrimary = Color.White,
    primaryContainer = Color(0xFF533483),
    onPrimaryContainer = Color.White,
    secondary = Color(0xFF533483),
    onSecondary = Color.White,
    tertiary = Color(0xFF4ADE80),
    background = Color(0xFF0F0F1A),
    onBackground = Color.White,
    surface = Color(0xFF1A1A2E),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF16162A),
    onSurfaceVariant = Color(0xFFB8B8D0),
    outline = Color(0xFF2A2A4A),
    outlineVariant = Color(0xFF2A2A4A),
    error = Color(0xFFEF4444),
    onError = Color.White
)

@Composable
fun ChatAppTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = DarkColorPalette
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ChatTypography,
        content = content
    )
}
