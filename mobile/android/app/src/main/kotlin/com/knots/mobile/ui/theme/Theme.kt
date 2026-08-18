package com.knots.mobile.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val KnotsColors = object {
    val background = Color(0xFF07111E)
    val background1 = Color(0xFF0B1628)
    val background2 = Color(0xFF0D1A2E)
    val backgroundElevated = Color(0xFF101E36)
    val surface1 = Color(0xFF0F1828)
    val surface2 = Color(0xFF141E30)
    val surface3 = Color(0xFF1A263C)

    val accent = Color(0xFF3DB5FF)
    val accentHover = Color(0xFF63C9FF)
    val accentActive = Color(0xFF2FA0E8)
    val accentGlow = Color(0x2E3DB5FF)

    val connectedGlow = Color(0xFF58C5FF)
    val connectedMint = Color(0xFF5EEAD4)
    val connectedMintGlow = Color(0x4D5EEAD4)

    val success = Color(0xFF2ED573)
    val successHover = Color(0xFF5AE08A)
    val successGlow = Color(0x2E2ED573)

    val warning = Color(0xFFFFB020)
    val warningGlow = Color(0x2EFFB020)

    val danger = Color(0xFFEF4444)
    val dangerGlow = Color(0x2EEFEF44)

    val textPrimary = Color(0xFFFFFFFF)
    val textSecondary = Color(0xFFCBD5E1)
    val textTertiary = Color(0xFF94A3B8)
    val textMuted = Color(0xFF64748B)

    val borderSubtle = Color(0x0DFFFFFF)
    val borderDefault = Color(0x0AFFFFFF)
    val borderAccent = Color(0x303DB5FF)
    val borderFocus = Color(0x9E3DB5FF)

    val glassBg = Color(0x590A101C)
    val glassCardBg = Color(0x8C121928)
    val glassCardBgStrong = Color(0x99121928)
    val glassBorder = Color(0x0FFFFFFF)
    val glassBorderStrong = Color(0x1FFFFFFF)
    val glassHighlight = Color(0x14FFFFFF)
    val glassHighlightStrong = Color(0x1FFFFFFF)
    val glassShadow = Color(0x52000000)
}

val knotsDarkColors: ColorScheme = darkColorScheme(
    primary = KnotsColors.accent,
    onPrimary = KnotsColors.background,
    primaryContainer = KnotsColors.background1,
    secondary = KnotsColors.success,
    onSecondary = KnotsColors.background,
    tertiary = KnotsColors.warning,
    onTertiary = KnotsColors.background,
    error = KnotsColors.danger,
    onError = KnotsColors.textPrimary,
    background = KnotsColors.background,
    onBackground = KnotsColors.textPrimary,
    surface = KnotsColors.surface1,
    onSurface = KnotsColors.textPrimary,
    surfaceVariant = KnotsColors.background2,
    onSurfaceVariant = KnotsColors.textSecondary,
    inverseOnSurface = KnotsColors.background,
    inverseSurface = KnotsColors.textPrimary,
    inversePrimary = KnotsColors.backgroundElevated,
    scrim = Color(0x80000000),
    surfaceTint = Color(0x003DB5FF),
    outline = KnotsColors.borderSubtle,
)

object KnotsThemeColors {
    val background = KnotsColors.background
    val background1 = KnotsColors.background1
    val background2 = KnotsColors.background2
    val backgroundElevated = KnotsColors.backgroundElevated
    val surface1 = KnotsColors.surface1
    val surface2 = KnotsColors.surface2
    val surface3 = KnotsColors.surface3

    val accent = KnotsColors.accent
    val accentHover = KnotsColors.accentHover
    val accentActive = KnotsColors.accentActive
    val accentGlow = KnotsColors.accentGlow
    val connectedGlow = KnotsColors.connectedGlow
    val connectedMint = KnotsColors.connectedMint
    val connectedMintGlow = KnotsColors.connectedMintGlow

    val success = KnotsColors.success
    val successGlow = KnotsColors.successGlow
    val warning = KnotsColors.warning
    val danger = KnotsColors.danger

    val textPrimary = KnotsColors.textPrimary
    val textSecondary = KnotsColors.textSecondary
    val textTertiary = KnotsColors.textTertiary
    val textMuted = KnotsColors.textMuted

    val borderSubtle = KnotsColors.borderSubtle
    val borderDefault = KnotsColors.borderDefault
    val borderAccent = KnotsColors.borderAccent
    val borderFocus = KnotsColors.borderFocus

    val glassBg = KnotsColors.glassBg
    val glassCardBg = KnotsColors.glassCardBg
    val glassCardBgStrong = KnotsColors.glassCardBgStrong
    val glassBorder = KnotsColors.glassBorder
    val glassBorderStrong = KnotsColors.glassBorderStrong
    val glassHighlight = KnotsColors.glassHighlight
    val glassHighlightStrong = KnotsColors.glassHighlightStrong
    val glassShadow = KnotsColors.glassShadow
}

@Composable
fun KnotsTheme(content: @Composable () -> Unit) {
    androidx.compose.material3.MaterialTheme(
        colorScheme = knotsDarkColors,
        typography = KnotsTypography,
        content = content
    )
}
