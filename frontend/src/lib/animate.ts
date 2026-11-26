// Generic, framework-agnostic position tween (no Konva import, so it can
// drive any node(s) that need to ease smoothly to a point) - used when a
// drag ends still overlapping something, to animate back to the last
// valid spot instead of snapping there instantly.
export function animatePositionTo(
  from: { x: number; y: number },
  to: { x: number; y: number },
  durationMs: number,
  onTick: (point: { x: number; y: number }) => void,
  onDone?: () => void
) {
  const startTime = performance.now();

  function step(now: number) {
    const t = Math.min(1, (now - startTime) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

    onTick({
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
    });

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      onDone?.();
    }
  }

  requestAnimationFrame(step);
}
