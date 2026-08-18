package com.knots.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.knots.mobile.ui.theme.KnotsRadius
import com.knots.mobile.ui.theme.KnotsSpacing
import com.knots.mobile.ui.theme.KnotsThemeColors

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    padding: PaddingValues = PaddingValues(horizontal = KnotsSpacing.cardPadding, vertical = KnotsSpacing.cardPadding),
    strong: Boolean = false,
    shape: Shape = KnotsRadius.shapeLg,
    content: @Composable (PaddingValues) -> Unit,
) {
    val bg = if (strong) KnotsThemeColors.glassCardBgStrong else KnotsThemeColors.glassCardBg
    val border = if (strong) KnotsThemeColors.glassBorderStrong else KnotsThemeColors.glassBorder
    val highlight = if (strong) KnotsThemeColors.glassHighlightStrong else KnotsThemeColors.glassHighlight

    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = 12.dp,
                shape = shape,
                ambientColor = KnotsThemeColors.glassShadow,
                spotColor = KnotsThemeColors.glassShadow,
            )
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(bg, KnotsThemeColors.glassBg),
                ),
                shape = shape,
            )
            .border(width = 1.dp, color = border, shape = shape)
            .drawWithContent {
                drawContent()
                val path = shape.toComposePath(size, layoutDirection, this)
                clipPath(path) {
                    drawRect(
                        brush = Brush.horizontalGradient(
                            colors = listOf(highlight, highlight, highlight.copy(alpha = highlight.alpha * 0.4f)),
                        ),
                        topLeft = Offset(0f, 0f),
                        size = Size(size.width, 1.dp.toPx()),
                    )
                }
            }
            .padding(padding),
    ) {
        content(padding)
    }
}

private fun Shape.toComposePath(
    size: Size,
    layoutDirection: LayoutDirection,
    density: androidx.compose.ui.unit.Density,
): Path = createOutline(size, layoutDirection, density).let { outline ->
    when (outline) {
        is Outline.Rectangle -> Path().apply { addRect(outline.rect) }
        is Outline.Rounded -> Path().apply { addRoundRect(outline.roundRect) }
        is Outline.Generic -> outline.path
    }
}
