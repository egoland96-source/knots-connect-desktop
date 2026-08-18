package com.knots.mobile.ui.components.livingrope

import androidx.compose.ui.graphics.Path
import kotlin.math.abs
import kotlin.math.PI

typealias RopePoint = Pair<Float, Float>

enum class RopeShapeId {
    Neutral,
    Silhouette,
    Knot,
    Graph,
}

object RopeShape {
    const val N = 80

    private fun clamp(v: Float, lo: Float, hi: Float): Float =
        maxOf(lo, minOf(hi, v))

    fun neutral(): List<RopePoint> {
        val pts = mutableListOf<RopePoint>()
        for (i in 0 until N) {
            val t = i / (N - 1f)
            val x = 100f + t * 600f
            val y = 80f + Math.sin(t * Math.PI * 2).toFloat() * 1.5f +
                Math.sin(t * Math.PI * 4 + 1.2f).toFloat() * 0.7f
            pts.add(Pair(x, y))
        }
        return pts
    }

    fun silhouette(): List<RopePoint> {
        val pts = mutableListOf<RopePoint>()
        val hx = 400f
        val hy = 46f
        val hr = 30f
        for (i in 0 until N) {
            val t = i / (N - 1f)
            if (t < 0.22f) {
                val u = t / 0.22f
                pts.add(Pair(265f + u * (334f - 265f), 128f - u * (128f - 60f)))
            } else if (t < 0.3f) {
                val u = (t - 0.22f) / 0.08f
                val x1 = hx - hr * 0.707f
                val y1 = hy + hr * 0.707f
                pts.add(Pair(334f + (x1 - 334f) * u, 60f + (y1 - 60f) * u))
            } else if (t < 0.7f) {
                val u = (t - 0.3f) / 0.4f
                val a = ((135f + u * 270f) * Math.PI / 180f)
                pts.add(Pair(
                    (hx + hr * Math.cos(a)).toFloat(),
                    (hy + hr * (0.58f * Math.sin(2 * a))).toFloat()
                ))
            } else if (t < 0.78f) {
                val u = (t - 0.7f) / 0.08f
                val x0 = hx + hr * 0.707f
                val y0 = hy + hr * 0.707f
                pts.add(Pair(x0 + (466f - x0) * u, y0 + (60f - y0) * u))
            } else {
                val u = (t - 0.78f) / 0.22f
                pts.add(Pair(466f + u * (535f - 466f), 60f + u * (128f - 60f)))
            }
        }
        return pts
    }

    fun knot(): List<RopePoint> {
        val pts = mutableListOf<RopePoint>()
        for (i in 0 until N) {
            val t = i / (N - 1f)
            val (x, y) = when {
                t < 0.33f -> {
                    val u = t / 0.33f
                    val a = Math.toRadians(-104.5 + u * 179.5)
                    Pair(
                        (415f + 58f * Math.cos(a)).toFloat(),
                        (88f + 58f * Math.sin(a)).toFloat()
                    )
                }
                t < 0.67f -> {
                    val u = (t - 0.33f) / 0.34f
                    val a = Math.toRadians(u * 180.0)
                    Pair(
                        (400f + 30f * Math.cos(a)).toFloat(),
                        (144f + 30f * Math.sin(a)).toFloat()
                    )
                }
                else -> {
                    val u = (t - 0.67f) / 0.33f
                    val a = Math.toRadians(105.0 - u * 180.5)
                    Pair(
                        (385f + 58f * Math.cos(a)).toFloat(),
                        (88f + 58f * Math.sin(a)).toFloat()
                    )
                }
            }
            pts.add(Pair(x, y))
        }
        return pts
    }

    data class GraphParams(
        val ping: Float = 0f,
        val avgPing: Float = 0f,
        val packetLoss: Float = 0f,
        val jitter: Float = 0f,
    )

    fun graph(p: GraphParams): List<RopePoint> {
        val pts = mutableListOf<RopePoint>()
        val ping = maxOf(5f, p.ping)
        val amp = 2f + 30f * (1 - Math.exp(-ping / 95.0).toFloat())
        val freqScale = 1f + ping / 180f
        val zig = clamp((ping - 90f) / 110f, 0f, 1f)
        val distort = clamp((ping - 160f) / 90f, 0f, 1f)
        val loss = clamp(p.packetLoss, 0f, 100f) / 100f
        val jitAmp = 1f + (p.jitter / 60f) * 0.6f
        val freq = (Math.PI / 210f) * freqScale
        for (i in 0 until N) {
            val t = i / (N - 1f)
            val x = 100f + t * 600f
            var v: Double = Math.sin(x * freq) * amp.toDouble()
            v += (Math.sin(x * freq * 2.17f + 1.7f) * amp * 0.28f * zig).toDouble()
            v += (Math.sin(x * freq * 0.51f + 0.9f) * amp * 0.18f * distort).toDouble()
            v += (Math.sin((x * 0.037f + 2.1f).toDouble()) * Math.sin((x * 0.011f).toDouble()) * amp * 0.35f * distort)
            val pull = Math.abs(Math.sin((x * 0.007f).toDouble()))
            if (pull > 0.92) v += ((pull - 0.92) / 0.08) * amp.toDouble() * 0.8 * loss.toDouble()
            val cut = if (loss > 0.35f) Math.sin((x * 0.005f + 1f).toDouble()) else -1.0
            if (cut > 0.82) v *= 0.3
            v *= jitAmp.toDouble()
            val vAbs = Math.abs(v)
            if (vAbs > 48.0) v = 48.0 else if (v < -48.0) v = -48.0
            pts.add(Pair(x.toFloat(), (80f + v).toFloat()))
        }
        return pts
    }

    fun pointsToPath(pts: List<RopePoint>): Path {
        val path = Path()
        if (pts.isEmpty()) return path
        path.moveTo(pts[0].first, pts[0].second)
        for (i in 0 until pts.size - 1) {
            val p0 = if (i - 1 >= 0) pts[i - 1] else pts[i]
            val p1 = pts[i]
            val p2 = pts[i + 1]
            val p3 = if (i + 2 < pts.size) pts[i + 2] else p2
            val c1x = p1.first + (p2.first - p0.first) / 6f
            val c1y = p1.second + (p2.second - p0.second) / 6f
            val c2x = p2.first - (p3.first - p1.first) / 6f
            val c2y = p2.second - (p3.second - p1.second) / 6f
            path.cubicTo(c1x, c1y, c2x, c2y, p2.first, p2.second)
        }
        return path
    }

    private fun minOf(a: Float, b: Float) = if (a < b) a else b
    private fun maxOf(a: Float, b: Float) = if (a > b) a else b
}