package com.knots.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.knots.mobile.ui.theme.KnotsThemeColors

@Composable
fun StatCard(
    label: String,
    value: String,
    icon: Painter,
    color: Color = KnotsThemeColors.accent,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        KnotsThemeColors.surface1.copy(alpha = 0.55f),
                        KnotsThemeColors.surface2.copy(alpha = 0.55f),
                    )
                ),
                shape = RoundedCornerShape(12.dp),
            )
            .border(1.dp, KnotsThemeColors.borderSubtle, RoundedCornerShape(12.dp)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                painter = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(16.dp),
            )
            Text(
                text = label,
                fontSize = 9.5.sp,
                fontWeight = FontWeight.W600,
                color = KnotsThemeColors.textMuted,
                letterSpacing = 0.4.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(start = 8.dp),
            )
            Box(modifier = Modifier.weight(1f))
            Text(
                text = value,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.W700,
                color = KnotsThemeColors.textPrimary,
                textAlign = TextAlign.End,
            )
        }
    }
}
