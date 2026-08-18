package com.knots.mobile.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Immutable
object KnotsRadius {
    val xs: Dp = 6.dp
    val sm: Dp = 8.dp
    val md: Dp = 12.dp
    val lg: Dp = 16.dp
    val xl: Dp = 20.dp
    val x2l: Dp = 24.dp
    val full: Dp = 9999.dp

    val shapeXs: Shape = RoundedCornerShape(xs)
    val shapeSm: Shape = RoundedCornerShape(sm)
    val shapeMd: Shape = RoundedCornerShape(md)
    val shapeLg: Shape = RoundedCornerShape(lg)
    val shapeXl: Shape = RoundedCornerShape(xl)
    val shape2l: Shape = RoundedCornerShape(x2l)
    val shapeFull: Shape = RoundedCornerShape(100)
}
