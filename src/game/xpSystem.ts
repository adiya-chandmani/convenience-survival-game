import type { Registries } from './loadData';
import { XpGem } from './xpGem';

export class XpSystem {
  public level = 1;
  public xp = 0;
  public xpToNext = 5;

  private pickupRadius: number;
  private attractRadius: number;
  private attractSpeed: number;

  constructor(data: Registries) {
    // "Magnet-like" but modest.
    const base = Number(data.drops?.xpGems?.magnet?.basePickupRadius ?? 90);
    const mul = Number(data.drops?.xpGems?.magnet?.attractRadiusMul ?? 2.2);
    const speed = Number(data.drops?.xpGems?.magnet?.attractSpeed ?? 520);

    // Tighten radius: small "magnet" feel, not vacuum.
    this.pickupRadius = Math.min(55, base * 0.55);
    this.attractRadius = Math.min(95, this.pickupRadius * Math.min(1.7, mul * 0.55));
    this.attractSpeed = Math.min(460, speed * 0.9);

    this.xpToNext = this.computeXpToNext(data, this.level);
  }

  update(data: Registries, gems: XpGem[], player: { x: number; y: number }, dtMs: number): number {
    const dtSec = dtMs / 1000;

    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      const dx = player.x - g.sprite.x;
      const dy = player.y - g.sprite.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= this.pickupRadius * this.pickupRadius) {
        this.xp += g.value;
        g.destroy();
        gems.splice(i, 1);
        continue;
      }

      if (d2 <= this.attractRadius * this.attractRadius) {
        const d = Math.sqrt(d2) || 1;
        const nx = dx / d;
        const ny = dy / d;
        g.sprite.x += nx * this.attractSpeed * dtSec;
        g.sprite.y += ny * this.attractSpeed * dtSec;
      }
    }

    // Level up
    let gained = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      gained++;
      this.xpToNext = this.computeXpToNext(data, this.level);
    }

    return gained;
  }

  private computeXpToNext(data: Registries, level: number) {
    // MVP: use progression.json formula: round(a*L + b*sqrt(L) + c) with piecewise.
    const spec = data.progression?.xpCurve?.xpToNextLevel;
    const pieces: any[] = spec?.piecewise ?? [];

    for (const p of pieces) {
      if (level >= p.fromLevel && level <= p.toLevel) {
        const a = Number(p.a ?? 5);
        const b = Number(p.b ?? 10);
        const c = Number(p.c ?? 0);
        const mul = Number(data.progression?.xpCurve?.globalMul ?? 1);
        return Math.max(5, Math.round((a * level + b * Math.sqrt(level) + c) * mul));
      }
    }

    return Math.max(5, 10 + level * 4);
  }
}
