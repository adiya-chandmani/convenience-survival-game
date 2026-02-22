import Phaser from 'phaser';
import type { Registries } from '../loadData';
import { Projectile } from '../projectile';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class CoinShotgun implements IWeapon {
  id = 'coin_shotgun';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private basePellets: number;
  private baseSpreadDeg: number;
  private speed: number;
  private baseRange: number;
  private range: number;
  private basePierce: number;

  private cooldownMs: number;
  private damage: number;
  private pellets: number;
  private spreadDeg: number;
  private pierce: number;

  private scene: Phaser.Scene;
  private spawnProjectile: (p: Projectile) => void;

  constructor(scene: Phaser.Scene, data: Registries, spawnProjectile: (p: Projectile) => void) {
    this.scene = scene;
    this.spawnProjectile = spawnProjectile;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon coin_shotgun');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 1500);
    this.baseDamage = Number(this.def.base.damage ?? 5);
    this.basePellets = Number(this.def.base.pellets ?? 5);
    this.baseSpreadDeg = Number(this.def.base.spreadDeg ?? 36);
    this.speed = Number(this.def.base.speed ?? 620);
    this.baseRange = Number(this.def.base.range ?? 260);
    this.range = this.baseRange;
    this.basePierce = Number(this.def.base.pierce ?? 0);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.pellets = this.basePellets;
    this.spreadDeg = this.baseSpreadDeg;
    this.pierce = this.basePierce;
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let pelletsAdd = 0;
    let spreadMul = 1;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (s.level <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.pelletsAdd) pelletsAdd += Number(s.pelletsAdd);
        if (s.spreadMul) spreadMul *= Number(s.spreadMul);
      }
    }

    // apply global + per-weapon mods
    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const rangeMulExtra = wm.rangeMul ?? 1;
    const pelletsAddExtra = wm.pelletsAdd ?? 0;
    const spreadMulExtra = wm.spreadMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.pellets = this.basePellets + pelletsAdd + pelletsAddExtra;
    this.spreadDeg = this.baseSpreadDeg * spreadMul * spreadMulExtra;
    this.range = this.baseRange * rangeMulExtra;
  }

  update(ctx: WeaponUpdateContext) {
    this.timer -= ctx.dtMs;
    if (this.timer > 0) return;
    if (!ctx.aimPoint) return;

    this.timer = this.cooldownMs;

    const dx = ctx.aimPoint.x - ctx.origin.x;
    const dy = ctx.aimPoint.y - ctx.origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const ang0 = Math.atan2(dy / len, dx / len);

    const count = Math.max(1, this.pellets);
    const spread = Phaser.Math.DegToRad(this.spreadDeg);

    for (let i = 0; i < count; i++) {
      const t01 = count === 1 ? 0 : i / (count - 1);
      const ang = ang0 + (t01 - 0.5) * spread;
      const vx = Math.cos(ang) * this.speed;
      const vy = Math.sin(ang) * this.speed;

      this.spawnProjectile(
        new Projectile(this.scene, ctx.origin.x, ctx.origin.y, vx, vy, {
          damage: this.damage,
          pierce: this.pierce,
          lifeMs: Math.max(300, Math.round((this.range / this.speed) * 1000)),
          r: 3,
        })
      );
    }
  }

  destroy() {}
}
