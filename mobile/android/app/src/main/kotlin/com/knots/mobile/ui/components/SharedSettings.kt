package com.knots.mobile.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.knots.mobile.ui.theme.KnotsMotion
import com.knots.mobile.ui.theme.KnotsRadius
import com.knots.mobile.ui.theme.KnotsSpacing
import com.knots.mobile.ui.theme.KnotsThemeColors

@Composable
fun ToggleItem(
    icon: Painter,
    title: String,
    desc: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    enabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val alphaVal = animateFloatAsState(
        targetValue = if (enabled) 1f else 0.5f,
        animationSpec = tween(durationMillis = KnotsMotion.duration200, easing = KnotsMotion.ease),
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .alpha(alphaVal.value)
            .clickable(enabled = enabled) { onCheckedChange(!checked) }
            .padding(vertical = KnotsSpacing.s3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(KnotsSpacing.s2),
        ) {
            Icon(
                painter = icon,
                contentDescription = null,
                tint = if (checked) KnotsThemeColors.accent else KnotsThemeColors.textMuted,
                modifier = Modifier.size(18.dp),
            )
            Column {
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.W600,
                    color = KnotsThemeColors.textPrimary,
                )
                Text(
                    text = desc,
                    fontSize = 12.5.sp,
                    color = KnotsThemeColors.textMuted,
                    lineHeight = 16.sp,
                )
            }
        }

        Switch(
            checked = checked,
            onCheckedChange = if (enabled) onCheckedChange else { checked -> Unit },
            modifier = Modifier.semantics { contentDescription = title },
            colors = SwitchDefaults.colors(
                checkedThumbColor = KnotsThemeColors.connectedGlow,
                checkedTrackColor = KnotsThemeColors.accent.copy(alpha = 0.4f),
                uncheckedThumbColor = KnotsThemeColors.textMuted,
                uncheckedTrackColor = KnotsThemeColors.borderDefault,
            ),
        )
    }
}

@Composable
fun SettingRow(
    icon: Painter,
    title: String,
    desc: String,
    control: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = KnotsSpacing.s3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(KnotsSpacing.s2),
        ) {
            Icon(
                painter = icon,
                contentDescription = null,
                tint = KnotsThemeColors.accent,
                modifier = Modifier.size(18.dp),
            )
            Column {
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.W600,
                    color = KnotsThemeColors.textPrimary,
                )
                Text(
                    text = desc,
                    fontSize = 12.5.sp,
                    color = KnotsThemeColors.textMuted,
                    lineHeight = 16.sp,
                )
            }
        }

        control()
    }
}

@Composable
fun SectionHeader(
    title: String,
    icon: Painter? = null,
    action: @Composable (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(KnotsSpacing.s2),
        ) {
            if (icon != null) {
                Icon(
                    painter = icon,
                    contentDescription = null,
                    tint = KnotsThemeColors.accent,
                    modifier = Modifier.size(18.dp),
                )
            }
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.W700,
                color = KnotsThemeColors.textPrimary,
            )
        }
        if (action != null) {
            action()
        }
    }
}
