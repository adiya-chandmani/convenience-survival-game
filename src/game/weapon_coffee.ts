import Phaser from 'phaser';
import type { Registries } from './loadData';
import { Projectile } from './projectile';

export class CoffeeWeapon {
  private timer = 0;

  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private speed: number;
  private basePierce: number;
  private lifeMs: number;
  private baseProjectiles: number;

  private cooldownMs: number;
  private damage: number;
  private pierce: number;
  private projectiles: number;

  constructor(data: Registries) {
    const def = data.weaponsById.get('coffee_can_shot') as any;
    if (!def) throw new Error('Missing weapon coffee_can_shot');
    this.def = def;

    this.baseCooldownMs = Number(def.base.cooldownMs);
    this.baseDamage = Number(def.base.damage);
    this.speed = Number(def.base.speed);
    this.basePierce = Number(def.base.pierce);
    this.lifeMs = Number(def.base.durationMs);
    this.baseProjectiles = Number(def.base.projectiles ?? 1);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.pierce = this.basePierce;
    this.projectiles = this.baseProjectiles;
  }

  setLevel(level: number, modifiers: { damageMul: number }) {

    let damageMul = 1;
    let cooldownMul = 1;
    let projectilesAdd = 0;
    let pierceAdd = 0;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (s.level <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.projectilesAdd) projectilesAdd += Number(s.projectilesAdd);
        if (s.pierceAdd) pierceAdd += Number(s.pierceAdd);
      }
    }

    this.damage = this.baseDamage * damageMul * (modifiers.damageMul ?? 1);
    this.cooldownMs = this.baseCooldownMs * cooldownMul;
    this.projectiles = this.baseProjectiles + projectilesAdd;
    this.pierce = this.basePierce + pierceAdd;
  }

  update(dtMs: number, scene: Phaser.Scene, origin: { x: number; y: number }, pickTarget: () => { x: number; y: number } | null, out: Projectile[]) {
    this.timer -= dtMs;
    if (this.timer > 0) return;

    const t = pickTarget();
    if (!t) return;

    this.timer = this.cooldownMs;

    const dx = t.x - origin.x;
    const dy = t.y - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    // Fire multiple projectiles with tiny spread
    const count = Math.max(1, this.projectiles);
    const spreadDeg = count === 1 ? 0 : 10;

    for (let i = 0; i < count; i++) {
      const t01 = count === 1 ? 0 : i / (count - 1);
      const ang = Math.atan2(ny, nx) + Phaser.Math.DegToRad((t01 - 0.5) * spreadDeg);
      const vx = Math.cos(ang) * this.speed;
      const vy = Math.sin(ang) * this.speed;

      out.push(new Projectile(scene, origin.x, origin.y, vx, vy, {
        damage: this.damage,
        pierce: this.pierce,
        lifeMs: this.lifeMs,
        r: 4,
      }));
    }
  }
}
