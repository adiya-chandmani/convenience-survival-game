import Phaser from 'phaser';
import type { Registries } from '../loadData';
import { Projectile } from '../projectile';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class StaplerBurst implements IWeapon {
  id = 'stapler_burst';
  level = 1;

  private def: any;

  private timer = 0;
  private cooldownMs = 1200;

  private baseDamage = 7;
  private damage = 7;

  private speed = 640;
  private lifeMs = 900;

  private baseProjectiles = 1;
  private projectiles = 1;

  private basePierce = 0;
  private pierce = 0;

  private burstShots = 3;
  private burstIntervalMs = 70;
  private burstLeft = 0;
  private burstGapLeftMs = 0;

  private scene: Phaser.Scene;
  private spawnProjectile: (p: Projectile) => void;

  constructor(data: Registries, scene: Phaser.Scene, spawnProjectile: (p: Projectile) => void) {
    this.scene = scene;
    this.spawnProjectile = spawnProjectile;

    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon stapler_burst');

    this.baseDamage = Number(this.def.base.damage ?? 7);
    this.cooldownMs = Number(this.def.base.cooldownMs ?? 1200);
    this.baseProjectiles = Number(this.def.base.projectiles ?? 1);
    this.speed = Number(this.def.base.speed ?? 640);
    this.basePierce = Number(this.def.base.pierce ?? 0);
    this.lifeMs = Number(this.def.base.durationMs ?? 900);

    const b = this.def.base.burst ?? { shots: 3, intervalMs: 70 };
    this.burstShots = Number(b.shots ?? 3);
    this.burstIntervalMs = Number(b.intervalMs ?? 70);

    this.damage = this.baseDamage;
    this.projectiles = this.baseProjectiles;
    this.pierce = this.basePierce;
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let projectilesAdd = 0;
    let pierceAdd = 0;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (Number(s.level) <= level) {
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
    const shotsAddExtra = wm.burstShotsAdd ?? 0;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = Number(this.def.base.cooldownMs ?? 1200) * cooldownMul * cdMulExtra;
    this.projectiles = this.baseProjectiles + projectilesAdd + projAddExtra;
    this.pierce = this.basePierce + pierceAdd + pierceAddExtra;
    this.burstShots = Math.max(1, Number((this.def.base.burst?.shots ?? 3)) + shotsAddExtra);
  }

  update(ctx: WeaponUpdateContext) {
    if (!ctx.aimPoint) return;

    // handle active burst
    if (this.burstLeft > 0) {
      this.burstGapLeftMs -= ctx.dtMs;
      if (this.burstGapLeftMs <= 0) {
        this.burstGapLeftMs = this.burstIntervalMs;
        this.burstLeft -= 1;
        this.fireOnce(ctx);
      }
      return;
    }

    this.timer -= ctx.dtMs;
    if (this.timer > 0) return;

    // start new burst
    this.timer = this.cooldownMs;
    this.burstLeft = Math.max(1, this.burstShots);
    this.burstGapLeftMs = 0;
  }

  private fireOnce(ctx: WeaponUpdateContext) {
    if (!ctx.aimPoint) return;

    const dx = ctx.aimPoint.x - ctx.origin.x;
    const dy = ctx.aimPoint.y - ctx.origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    const count = Math.max(1, this.projectiles);
    const spreadDeg = count == 1 ? 0 : 9;

    for (let i = 0; i < count; i++) {
      const t01 = count === 1 ? 0 : i / (count - 1);
      const ang = Math.atan2(ny, nx) + Phaser.Math.DegToRad((t01 - 0.5) * spreadDeg);
      const vx = Math.cos(ang) * this.speed;
      const vy = Math.sin(ang) * this.speed;

      const col = 0xffdd88;
      this.spawnProjectile(
        new Projectile(this.scene, ctx.origin.x, ctx.origin.y, vx, vy, {
          damage: this.damage,
          pierce: this.pierce,
          lifeMs: this.lifeMs,
          r: 3,
          color: col,
        })
      );
    }
  }

  destroy() {}
}
