import Phaser from 'phaser';
import type { Registries } from '../loadData';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';
import { BoomerangProjectile } from './boomerangProjectile';

export class BoxcutterBoomerang implements IWeapon {
  id = 'boxcutter_boomerang';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private baseProjectiles: number;
  private speed: number;
  private baseRange: number;
  private basePierce: number;
  private hitLifeMs: number;

  private cooldownMs: number;
  private damage: number;
  private projectiles: number;
  private range: number;
  private pierce: number;

  private scene: Phaser.Scene;
  private spawnProjectile: (p: any) => void;

  constructor(scene: Phaser.Scene, data: Registries, spawnProjectile: (p: any) => void) {
    this.scene = scene;
    this.spawnProjectile = spawnProjectile;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon boxcutter_boomerang');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 1100);
    this.baseDamage = Number(this.def.base.damage ?? 8);
    this.baseProjectiles = Number(this.def.base.projectiles ?? 1);
    this.speed = Number(this.def.base.speed ?? 520);
    this.baseRange = Number(this.def.base.range ?? 320);
    this.basePierce = Number(this.def.base.pierce ?? 2);
    this.hitLifeMs = 1400;

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.projectiles = this.baseProjectiles;
    this.range = this.baseRange;
    this.pierce = this.basePierce;
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let projectilesAdd = 0;
    let rangeAdd = 0;
    let pierceAdd = 0;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (s.level <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.projectilesAdd) projectilesAdd += Number(s.projectilesAdd);
        if (s.rangeAdd) rangeAdd += Number(s.rangeAdd);
        if (s.pierceAdd) pierceAdd += Number(s.pierceAdd);
      }
    }

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const projAddExtra = wm.projectilesAdd ?? 0;
    const pierceAddExtra = wm.pierceAdd ?? 0;
    const rangeMulExtra = wm.rangeMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.projectiles = this.baseProjectiles + projectilesAdd + projAddExtra;
    this.range = (this.baseRange + rangeAdd) * rangeMulExtra;
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
    const dir = { x: dx / len, y: dy / len };

    const count = Math.max(1, this.projectiles);
    const spreadDeg = count === 1 ? 0 : 14;

    for (let i = 0; i < count; i++) {
      const t01 = count === 1 ? 0 : i / (count - 1);
      const ang = Math.atan2(dir.y, dir.x) + Phaser.Math.DegToRad((t01 - 0.5) * spreadDeg);
      const d = { x: Math.cos(ang), y: Math.sin(ang) };

      this.spawnProjectile(
        new BoomerangProjectile(
          this.scene,
          { x: ctx.origin.x, y: ctx.origin.y },
          d,
          {
            damage: this.damage,
            pierce: this.pierce,
            lifeMs: this.hitLifeMs,
            r: 4,
            speed: this.speed,
            range: this.range,
          }
        )
      );
    }
  }

  destroy() {}
}
