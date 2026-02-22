export function difficultyT(elapsedSec: number, runDurationSec: number) {
  const t = runDurationSec > 0 ? elapsedSec / runDurationSec : 0;
  return Math.max(0, Math.min(1, t));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function enemyScalars(t: number) {
  // 20m at t=1 => about 3x HP, 1.35x speed, ~1.9x dmg (Vampire Survivors-like pressure)
  const hpMul = lerp(1.0, 3.0, Math.pow(t, 1.2));
  const speedMul = lerp(1.0, 1.35, Math.pow(t, 1.0));
  const dmgMul = lerp(1.0, 1.9, Math.pow(t, 1.1));
  return { hpMul, speedMul, dmgMul };
}
