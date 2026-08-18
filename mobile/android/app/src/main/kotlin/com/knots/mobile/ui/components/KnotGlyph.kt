package com.knots.mobile.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.knots.mobile.ui.theme.KnotsThemeColors

@Composable
fun KnotGlyph(
    accent: Color = KnotsThemeColors.connectedGlow,
    modifier: Modifier = Modifier,
    size: Dp = 34.dp,
) {
    Canvas(
        modifier = modifier
            .size(size)
            .semantics { contentDescription = "Knots Connect logo" },
    ) {
        drawKnotPath(
            canvasWidth = this.size.width,
            canvasHeight = this.size.height,
            color = Color.White,
        )
    }
}

@Composable
fun KnotBadge(
    accent: Color = KnotsThemeColors.accent,
    modifier: Modifier = Modifier,
    size: Dp = 36.dp,
) {
    val badgeBrush = Brush.horizontalGradient(
        colors = listOf(
            accent.copy(alpha = 0.18f),
            accent.copy(alpha = 0.06f),
        )
    )

    Box(
        modifier = modifier
            .size(size)
            .background(badgeBrush, shape = RoundedCornerShape(100))
            .border(
                width = 1.dp,
                color = Color(0x1AFFFFFF),
                shape = RoundedCornerShape(100),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.size((size.value - 12).dp)) {
            drawKnotPath(
                canvasWidth = this.size.width,
                canvasHeight = this.size.height,
                color = Color.White,
            )
        }
    }
}

fun DrawScope.drawKnotPath(
    canvasWidth: Float,
    canvasHeight: Float,
    color: Color,
) {
    val scaleW = canvasWidth / 24f
    val scaleH = canvasHeight / 24f

    val path = Path().apply {
        fillType = PathFillType.EvenOdd
        moveTo(5f * scaleW, 18f * scaleH)
        cubicTo(9f * scaleW, 20f * scaleH, 16f * scaleW, 17f * scaleH, 16f * scaleW, 12.5f * scaleH)
        cubicTo(16f * scaleW, 8.5f * scaleH, 12f * scaleW, 7.5f * scaleH, 10f * scaleW, 9f * scaleH)
        cubicTo(8f * scaleW, 10.5f * scaleH, 8.5f * scaleW, 13.5f * scaleH, 11f * scaleW, 13f * scaleH)
        cubicTo(13.5f * scaleW, 12.5f * scaleH, 16f * scaleW, 10.5f * scaleH, 16.5f * scaleW, 7.5f * scaleH)
    }

    drawPath(
        path = path,
        color = color,
        style = Stroke(
            width = 1.9f * minOf(scaleW, scaleH),
            cap = StrokeCap.Round,
        ),
    )
}
