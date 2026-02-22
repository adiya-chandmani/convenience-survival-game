export function circlesOverlap(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.r + b.r;
  return dx * dx + dy * dy <= rr * rr;
}
