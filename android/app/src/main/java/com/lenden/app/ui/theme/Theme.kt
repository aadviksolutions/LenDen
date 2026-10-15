package com.lenden.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = NavyPrimary,
    onPrimary = SurfaceCard,
    primaryContainer = NavySecondary,
    onPrimaryContainer = SurfaceWarm,
    secondary = EmeraldPrimary,
    onSecondary = SurfaceCard,
    secondaryContainer = EmeraldContainer,
    onSecondaryContainer = EmeraldPrimary,
    tertiary = AmberWarning,
    background = SurfaceWarm,
    onBackground = TextPrimary,
    surface = SurfaceCard,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceWarm,
    onSurfaceVariant = TextSecondary,
    outline = BorderSubtle,
    error = RoseError,
    errorContainer = RoseContainer
)

@Composable
fun LendenTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = NavyPrimary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
