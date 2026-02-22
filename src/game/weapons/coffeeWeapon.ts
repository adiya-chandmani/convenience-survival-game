import Phaser from 'phaser';
import type { Registries } from '../loadData';
import { Projectile } from '../projectile';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class CoffeeWeapon implements IWeapon {
  id = 'coffee_can_shot';
  level = 1;

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

  private scene: Phaser.Scene;
  private spawnProjectile: (p: Projectile) => void;

  constructor(data: Registries, scene: Phaser.Scene, spawnProjectile: (p: Projectile) => void) {
    this.scene = scene;
    this.spawnProjectile = spawnProjectile;

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

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

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

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const projAddExtra = wm.projectilesAdd ?? 0;
    const pierceAddExtra = wm.pierceAdd ?? 0;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.projectiles = this.baseProjectiles + projectilesAdd + projAddExtra;
    this.pierce = this.basePierce + pierceAdd + pierceAddExtra;
  }

  update(ctx: WeaponUpdateContext) {
    this.timer -= ctx.dtMs;
    if (this.timer > 0) return;
    if (!ctx.aimPoint) return;

    this.timer = this.cooldownMs;

    const dx = ctx.aimPoint.x - ctx.origin.x;
    const dy = ctx.aimPoint.y - ctx.origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    const count = Math.max(1, this.projectiles);
    const spreadDeg = count === 1 ? 0 : 10;

    for (let i = 0; i < count; i++) {
      const t01 = count === 1 ? 0 : i / (count - 1);
      const ang = Math.atan2(ny, nx) + Phaser.Math.DegToRad((t01 - 0.5) * spreadDeg);
      const vx = Math.cos(ang) * this.speed;
      const vy = Math.sin(ang) * this.speed;

      const r = 4 + Math.min(3, Math.floor((this.level - 1) / 2));
      const col = this.level >= 7 ? 0xffffff : this.level >= 4 ? 0xbfefff : 0x9ad1ff;

      this.spawnProjectile(
        new Projectile(this.scene, ctx.origin.x, ctx.origin.y, vx, vy, {
          damage: this.damage,
          pierce: this.pierce,
          lifeMs: this.lifeMs,
          r,
          color: col,
        })
      );
    }
  }

  destroy() {}
}
