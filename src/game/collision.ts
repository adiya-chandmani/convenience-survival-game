// Simple circle-vs-AABB collision resolution for player vs solid obstacles.

export type Aabb = { x: number; y: number; w: number; h: number };

export function resolveCircleAabb(
  circle: { x: number; y: number; r: number },
  box: Aabb
): { x: number; y: number; hit: boolean } {
  // Find closest point on box to circle center.
  const closestX = clamp(circle.x, box.x, box.x + box.w);
  const closestY = clamp(circle.y, box.y, box.y + box.h);

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const dist2 = dx * dx + dy * dy;

  if (dist2 >= circle.r * circle.r) return { x: circle.x, y: circle.y, hit: false };

  // Push out along the smallest axis; if exactly inside corner, push by normalized vector.
  const dist = Math.sqrt(dist2) || 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;

  const push = circle.r - dist;
  return { x: circle.x + nx * push, y: circle.y + ny * push, hit: true };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
