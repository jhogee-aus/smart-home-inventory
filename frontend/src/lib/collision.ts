// Shared axis-aligned-bounding-box collision rule used by every draggable/
// resizable thing on a canvas (house rooms, zones inside a room, ...). One
// implementation so "can't overlap while dragging" and "can't overlap while
// resizing" always mean exactly the same thing, wherever they're used.

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

// `labelAbove` extends a box upward by that many units before testing, for
// shapes whose name label floats ABOVE their own rect (e.g. house rooms) -
// pass 0 for shapes whose label sits inside their own bounds (e.g. zones).
export function boxesOverlap(a: AABB, b: AABB, labelAbove = 0): boolean {
  const aTop = a.y - labelAbove;
  const aBottom = a.y + a.h;
  const bTop = b.y - labelAbove;
  const bBottom = b.y + b.h;

  return a.x < b.x + b.w && a.x + a.w > b.x && aTop < bBottom && aBottom > bTop;
}

export function overlapsAny(candidate: AABB, others: AABB[], labelAbove = 0): boolean {
  return others.some(o => boxesOverlap(candidate, o, labelAbove));
}

// If `desired` would overlap anything in `others`, fall back to the last
// known-good box instead. Used for RESIZING (rooms and zones): growth
// stops right at a neighbour's edge, since it only ever grows from one
// fixed corner, so there's no "jump to the far side" possible here.
export function resolveNonOverlapping<T extends AABB>(
  desired: T,
  fallback: T,
  others: AABB[],
  labelAbove = 0
): T {
  return overlapsAny(desired, others, labelAbove) ? fallback : desired;
}

// Used for MOVING (rooms and zones) instead: during the drag itself the
// shape is allowed to follow the cursor freely through an overlap (the
// caller shows a visual warning for that - see each canvas's onDragMove);
// only at drag end does this decide whether the final position is
// accepted, or should be eased back to the last known-good one. Unlike
// resolveNonOverlapping, this never silently swaps in the fallback mid-
// drag, which is what caused the old "teleport past the obstacle" feel -
// a 2D position can jump from "blocked on this side" to "clear on the far
// side" the instant the cursor crosses the obstacle's middle, whereas a
// resize only ever grows monotonically from a fixed corner and so can't.
export function resolveFreeDragEnd<T extends AABB>(
  desired: T,
  lastValid: T,
  others: AABB[],
  labelAbove = 0
): { position: T; overlapping: boolean } {
  const overlapping = overlapsAny(desired, others, labelAbove);
  return { position: overlapping ? lastValid : desired, overlapping };
}
