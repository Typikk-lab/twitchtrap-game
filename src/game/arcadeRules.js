export const GAME_WIDTH = 800
export const GAME_HEIGHT = 420
export const MAX_RAMP_SECONDS = 30

export function getTargetAtElapsed(elapsedSeconds) {
  if (!Number.isFinite(elapsedSeconds)) {
    throw new TypeError('Elapsed time must be a finite number')
  }

  const elapsed = Math.max(0, elapsedSeconds)
  const ramp = Math.min(elapsed / MAX_RAMP_SECONDS, 1)
  const size = Math.max(45, 110 - ramp * 65)
  const speed = 0.6 + ramp * 2.1
  const ampX = 70 + ramp * 80
  const ampY = 40 + ramp * 50
  const centerX = GAME_WIDTH / 2 - size / 2
  const centerY = GAME_HEIGHT / 2 - size / 2

  return {
    x: centerX + Math.sin(elapsed * speed) * ampX,
    y: centerY + Math.sin(elapsed * speed * 1.3) * ampY,
    size,
  }
}

export function isCursorInsideTarget(cursor, target) {
  if (
    !cursor ||
    !target ||
    !Number.isFinite(cursor.x) ||
    !Number.isFinite(cursor.y) ||
    !Number.isFinite(target.x) ||
    !Number.isFinite(target.y) ||
    !Number.isFinite(target.size) ||
    target.size < 0
  ) {
    return false
  }

  return (
    cursor.x >= target.x &&
    cursor.x <= target.x + target.size &&
    cursor.y >= target.y &&
    cursor.y <= target.y + target.size
  )
}
