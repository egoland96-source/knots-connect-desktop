package com.knots.mobile.ui.components.livingrope

class RopeStateManager {
    var currentShape: RopeShapeId = RopeShapeId.Neutral
        private set

    val morphValue: Float
        get() = spring.position

    val morphInProgress: Boolean
        get() = !spring.isSettled || pendingSequence.isNotEmpty()

    var fromShape: RopeShapeId = RopeShapeId.Neutral
        private set

    val intoShape: RopeShapeId
        get() = currentShape

    private val spring = SpringSim(stiffness = 110f, damping = 20f, mass = 1f)
    private val pendingSequence: ArrayDeque<RopeShapeId> = ArrayDeque()
    private var onCompleteCallback: (() -> Unit)? = null

    fun computeTransition(
        target: RopeShapeId,
        isConnecting: Boolean,
    ): List<RopeShapeId> {
        if (currentShape == target && !morphInProgress) {
            return listOf(target)
        }

        return when {
            target == RopeShapeId.Neutral -> listOf(RopeShapeId.Neutral)
            isConnecting -> listOf(RopeShapeId.Silhouette, target)
            currentShape == RopeShapeId.Neutral -> listOf(target)
            else -> listOf(RopeShapeId.Neutral, target)
        }
    }

    fun startTransition(
        target: RopeShapeId,
        isConnecting: Boolean,
        onComplete: (() -> Unit)? = null,
    ): List<RopeShapeId> {
        if (currentShape == target && !morphInProgress) {
            onComplete?.invoke()
            return listOf(target)
        }

        val sequence = computeTransition(target, isConnecting)
        if (sequence.isEmpty()) {
            onComplete?.invoke()
            return emptyList()
        }

        pendingSequence.clear()
        sequence.forEach { pendingSequence.addLast(it) }
        onCompleteCallback = onComplete

        stepToNext()
        return sequence
    }

    private fun stepToNext() {
        if (pendingSequence.isEmpty()) {
            fromShape = currentShape
            onCompleteCallback?.invoke()
            onCompleteCallback = null
            return
        }

        val next = pendingSequence.removeFirst()
        fromShape = currentShape
        currentShape = next
        spring.setTarget(1f)
        spring.reset()
    }

    fun update(deltaTimeSec: Float): Boolean {
        if (spring.isSettled && pendingSequence.isEmpty()) return false

        spring.step(deltaTimeSec)

        if (spring.isSettled && pendingSequence.isNotEmpty()) {
            stepToNext()
        }

        return !spring.isSettled || pendingSequence.isNotEmpty()
    }

    val isSettled: Boolean
        get() = spring.isSettled && pendingSequence.isEmpty()
}

private class SpringSim(
    private val stiffness: Float,
    private val damping: Float,
    private val mass: Float,
) {
    var position: Float = 0f
        private set

    private var velocity: Float = 0f
    var isSettled: Boolean = true
        private set

    fun setTarget(target: Float) {
        isSettled = false
    }

    fun reset() {
        position = 0f
        velocity = 0f
        isSettled = false
    }

    fun step(dt: Float): Float {
        val target = 1f
        val accel = (target - position) * stiffness - velocity * damping
        velocity += accel * dt
        position += velocity * dt

        val restingThreshold = 0.001f
        if (kotlin.math.abs(target - position) < restingThreshold && kotlin.math.abs(velocity) < 0.01f) {
            position = target
            velocity = 0f
            isSettled = true
        }

        return position.coerceIn(0f, 1f)
    }
}
