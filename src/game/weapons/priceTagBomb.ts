import Phaser from 'phaser';
import type { Registries } from '../loadData';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class PriceTagBomb implements IWeapon {
  id = 'price_tag_bomb';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private baseThrowRange: number;
  private baseRadius: number;
  private baseProjectiles: number;

  private cooldownMs: number;
  private damage: number;
  private throwRange: number;
  private radius: number;
  private projectiles: number;

  private explosions: Array<{ x: number; y: number; leftMs: number }> = [];

  private gfx: Phaser.GameObjects.Graphics;
  private getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>;

  constructor(data: Registries, scene: Phaser.Scene, getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>) {
    this.getEnemies = getEnemies;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon price_tag_bomb');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 1900);
    this.baseDamage = Number(this.def.base.damage ?? 12);
    this.baseThrowRange = Number(this.def.base.throwRange ?? 460);
    this.baseRadius = Number(this.def.base.radius ?? 92);
    this.baseProjectiles = Number(this.def.base.projectiles ?? 1);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.throwRange = this.baseThrowRange;
    this.radius = this.baseRadius;
    this.projectiles = this.baseProjectiles;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(6);
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let radiusAdd = 0;
    let projectilesAdd = 0;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (Number(s.level) <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.radiusAdd) radiusAdd += Number(s.radiusAdd);
        if (s.projectilesAdd) projectilesAdd += Number(s.projectilesAdd);
      }
    }

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const radiusAddExtra = wm.radiusAdd ?? 0;
    const projAddExtra = wm.projectilesAdd ?? 0;
    const throwMulExtra = wm.throwRangeMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.radius = this.baseRadius + radiusAdd + radiusAddExtra;
    this.projectiles = this.baseProjectiles + projectilesAdd + projAddExtra;
    this.throwRange = this.baseThrowRange * throwMulExtra;
  }

  update(ctx: WeaponUpdateContext) {
    this.gfx.clear();

    this.timer -= ctx.dtMs;
    if (this.timer <= 0 && ctx.aimPoint) {
      this.timer = this.cooldownMs;
      this.spawnExplosions(ctx);
    }

    // animate explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.leftMs -= ctx.dtMs;
      const pct = Phaser.Math.Clamp(ex.leftMs / 220, 0, 1);

      this.gfx.fillStyle(0xffc857, 0.08 + 0.18 * pct);
      this.gfx.fillCircle(ex.x, ex.y, this.radius);
      this.gfx.lineStyle(2, 0xffffff, 0.12 + 0.22 * pct);
      this.gfx.strokeCircle(ex.x, ex.y, this.radius);

      if (ex.leftMs <= 0) this.explosions.splice(i, 1);
    }
  }

  private spawnExplosions(ctx: WeaponUpdateContext) {
    if (!ctx.aimPoint) return;

    const ox = ctx.origin.x;
    const oy = ctx.origin.y;
    const dx = ctx.aimPoint.x - ox;
    const dy = ctx.aimPoint.y - oy;
    const len = Math.hypot(dx, dy) || 1;
    const ang0 = Math.atan2(dy / len, dx / len);

    const count = Math.max(1, this.projectiles);
    const spread = count === 1 ? 0 : Phaser.Math.DegToRad(18);

    for (let i = 0; i < count; i++) {
      const t01 = count === 1 ? 0 : i / (count - 1);
      const ang = ang0 + (t01 - 0.5) * spread;
      const x = ox + Math.cos(ang) * this.throwRange;
      const y = oy + Math.sin(ang) * this.throwRange;

      this.explosions.push({ x, y, leftMs: 220 });
      this.damageAt(x, y);
    }
  }

  private damageAt(x: number, y: number) {
    const r2 = this.radius * this.radius;
    for (const e of this.getEnemies()) {
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= r2 + e.r * e.r) e.takeDamage(this.damage);
    }
  }

  destroy() {
    this.gfx.destroy();
    this.explosions = [];
  }
}
