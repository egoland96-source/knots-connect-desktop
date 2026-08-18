package com.knots.mobile.ui.components.livingrope

import androidx.compose.ui.graphics.Path
import kotlin.math.sqrt

class VerletChain {
    companion object {
        private const val N = 80
        private const val K_TARGET = 240f
        private const val K_END = 700f
        private const val FRICTION = 0.9f
        private const val ITER = 5
        private const val PING_K = 120f
        private const val PING_D = 22f
    }

    private val positions = Array(N) { FloatArray(2) }
    private val prevPositions = Array(N) { FloatArray(2) }
    private var fromPositions: List<RopePoint> = emptyList()

    private var smoothPing = 0f
    private var pingVelocity = 0f

    var currentPath: Path = Path()
        private set

    init {
        val init = RopeShape.neutral()
        for (i in 0 until N) {
            positions[i][0] = init[i].first
            positions[i][1] = init[i].second
            prevPositions[i][0] = init[i].first
            prevPositions[i][1] = init[i].second
        }
        currentPath = RopeShape.pointsToPath(init)
    }

    fun updateTelemetry(
        newPing: Float,
        avgPing: Float,
        packetLoss: Float,
        jitter: Float,
    ) {
        val target = newPing * 0.7f + avgPing * 0.3f
        val dt = 1f / 60f

        val accel = (target - smoothPing) * PING_K - pingVelocity * PING_D
        val nextVel = pingVelocity + accel * dt
        val nextPos = smoothPing + nextVel * dt

        if (kotlin.math.abs(target - nextPos) < 0.05f && kotlin.math.abs(nextVel) < 0.05f) {
            smoothPing = target
            pingVelocity = 0f
        } else {
            smoothPing = nextPos
            pingVelocity = nextVel
        }
    }

    fun setMorphStart(fromShape: RopeShapeId, params: RopeShape.GraphParams) {
        fromPositions = when (fromShape) {
            RopeShapeId.Neutral -> RopeShape.neutral()
            RopeShapeId.Silhouette -> RopeShape.silhouette()
            RopeShapeId.Knot -> RopeShape.knot()
            RopeShapeId.Graph -> RopeShape.graph(params)
        }
        for (i in 0 until N) {
            positions[i][0] = fromPositions[i].first
            positions[i][1] = fromPositions[i].second
            prevPositions[i][0] = fromPositions[i].first
            prevPositions[i][1] = fromPositions[i].second
        }
    }

    fun step(
        morphValue: Float,
        intoShape: RopeShapeId,
        params: RopeShape.GraphParams,
        deltaMs: Float,
    ): Path? {
        val dt = (deltaMs * 0.001f).coerceIn(0f, 0.05f)
        val dt2 = dt * dt

        val shapePts = when (intoShape) {
            RopeShapeId.Neutral -> RopeShape.neutral()
            RopeShapeId.Silhouette -> RopeShape.silhouette()
            RopeShapeId.Knot -> RopeShape.knot()
            RopeShapeId.Graph -> RopeShape.graph(params)
        }

        val m = morphValue.coerceIn(0f, 1f)
        val effectiveFrom = if (fromPositions.isNotEmpty()) fromPositions else shapePts

        for (i in 0 until N) {
            val fromX = effectiveFrom[i].first
            val fromY = effectiveFrom[i].second
            val intoX = shapePts[i].first
            val intoY = shapePts[i].second

            val targetX = fromX + (intoX - fromX) * m
            val targetY = fromY + (intoY - fromY) * m

            val k = if (i == 0 || i == N - 1) K_END else K_TARGET
            val ax = (targetX - positions[i][0]) * k
            val ay = (targetY - positions[i][1]) * k
            val vx = (positions[i][0] - prevPositions[i][0]) * FRICTION
            val vy = (positions[i][1] - prevPositions[i][1]) * FRICTION

            prevPositions[i][0] = positions[i][0]
            prevPositions[i][1] = positions[i][1]
            positions[i][0] = positions[i][0] + vx + ax * dt2
            positions[i][1] = positions[i][1] + vy + ay * dt2
        }

        for (iter in 0 until ITER) {
            for (i in 0 until N - 1) {
                val a = positions[i]
                val b = positions[i + 1]
                val dx = b[0] - a[0]
                val dy = b[1] - a[1]
                val dist = sqrt(dx * dx + dy * dy)
                if (dist < 0.0001f) continue
                val restLen = getRestLen(i, effectiveFrom, shapePts, m)
                val diff = (dist - restLen) / dist
                val ox = dx * diff * 0.5f
                val oy = dy * diff * 0.5f
                a[0] += ox
                a[1] += oy
                b[0] -= ox
                b[1] -= oy
            }
        }

        val pts = List(N) { i ->
            RopePoint(positions[i][0], positions[i][1])
        }
        currentPath = RopeShape.pointsToPath(pts)
        return currentPath
    }

    private fun getRestLen(i: Int, fromPts: List<RopePoint>, intoPts: List<RopePoint>, m: Float): Float {
        val fromDx = fromPts[i + 1].first - fromPts[i].first
        val fromDy = fromPts[i + 1].second - fromPts[i].second
        val intoDx = intoPts[i + 1].first - intoPts[i].first
        val intoDy = intoPts[i + 1].second - intoPts[i].second

        val dx = fromDx + (intoDx - fromDx) * m
        val dy = fromDy + (intoDy - fromDy) * m
        val d = sqrt(dx * dx + dy * dy)
        return if (d > 0f) d else 7.6f
    }

    fun getCurrentPositions(): List<RopePoint> {
        return List(N) { i ->
            RopePoint(positions[i][0], positions[i][1])
        }
    }

    fun reset() {
        val init = RopeShape.neutral()
        fromPositions = init
        for (i in 0 until N) {
            positions[i][0] = init[i].first
            positions[i][1] = init[i].second
            prevPositions[i][0] = init[i].first
            prevPositions[i][1] = init[i].second
        }
        smoothPing = 0f
        pingVelocity = 0f
        currentPath = RopeShape.pointsToPath(init)
    }
}
