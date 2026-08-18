package com.knots.mobile.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.TweenSpec
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.TransformOrigin

@Immutable
object KnotsMotion {
    val ease: Easing = CubicBezierEasing(0.4f, 0.0f, 0.2f, 1.0f)
    val easeOut: Easing = CubicBezierEasing(0.25f, 0.46f, 0.45f, 0.94f)
    val easeSpring: Easing = CubicBezierEasing(0.34f, 1.56f, 0.64f, 1.0f)
    val easeSpringGentle: Easing = CubicBezierEasing(0.4f, 1.4f, 0.6f, 1.0f)
    val easeInOut: Easing = CubicBezierEasing(0.4f, 0.0f, 0.2f, 1.0f)

    val duration50: Int = 50
    val duration100: Int = 100
    val duration150: Int = 150
    val duration200: Int = 200
    val duration250: Int = 250
    val duration300: Int = 300
    val duration350: Int = 350
    val duration400: Int = 400
    val duration500: Int = 500
    val duration600: Int = 600
    val duration700: Int = 700
    val duration1000: Int = 1000

    val fps60: Int = 60

    fun standard(delay: Int = 0, duration: Int = duration300): TweenSpec<Float> =
        tween(durationMillis = duration, easing = ease, delayMillis = delay)

    fun standardOut(delay: Int = 0, duration: Int = duration300): TweenSpec<Float> =
        tween(durationMillis = duration, easing = easeOut, delayMillis = delay)

    val infiniteLoop: RepeatMode = RepeatMode.Restart

    object Transform {
        val center: TransformOrigin = TransformOrigin.Center
    }

    object Brush {
        val transparent: SolidColor = SolidColor(Color.Transparent)
    }
}
