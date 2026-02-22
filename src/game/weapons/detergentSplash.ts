import Phaser from 'phaser';
import type { Registries } from '../loadData';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class DetergentSplash implements IWeapon {
  id = 'detergent_splash';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private baseThrowRange: number;
  private baseRadius: number;
  private baseDurationMs: number;
  private baseTickMs: number;
  private baseProjectiles: number;

  private cooldownMs: number;
  private damage: number;
  private throwRange: number;
  private radius: number;
  private durationMs: number;
  private tickMs: number;
  private projectiles: number;

  private pools: Array<{ x: number; y: number; leftMs: number; tickLeftMs: number }> = [];

  private gfx: Phaser.GameObjects.Graphics;
  private getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>;

  constructor(data: Registries, scene: Phaser.Scene, getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>) {
    this.getEnemies = getEnemies;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon detergent_splash');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 1700);
    this.baseDamage = Number(this.def.base.damage ?? 4);
    this.baseThrowRange = Number(this.def.base.throwRange ?? 420);
    this.baseRadius = Number(this.def.base.radius ?? 80);
    this.baseDurationMs = Number(this.def.base.durationMs ?? 1400);
    this.baseTickMs = Number(this.def.base.tickMs ?? 200);
    this.baseProjectiles = Number(this.def.base.projectiles ?? 1);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.throwRange = this.baseThrowRange;
    this.radius = this.baseRadius;
    this.durationMs = this.baseDurationMs;
    this.tickMs = this.baseTickMs;
    this.projectiles = this.baseProjectiles;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(6);
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let radiusAdd = 0;
    let durationMul = 1;
    let projectilesAdd = 0;
    let tickMsMul = 1;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (Number(s.level) <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.radiusAdd) radiusAdd += Number(s.radiusAdd);
        if (s.durationMul) durationMul *= Number(s.durationMul);
        if (s.projectilesAdd) projectilesAdd += Number(s.projectilesAdd);
        if (s.tickMsMul) tickMsMul *= Number(s.tickMsMul);
      }
    }

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const radiusAddExtra = wm.radiusAdd ?? 0;
    const durationMulExtra = wm.durationMul ?? 1;
    const projAddExtra = wm.projectilesAdd ?? 0;
    const tickMulExtra = wm.tickMsMul ?? 1;
    const throwMulExtra = wm.throwRangeMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.radius = this.baseRadius + radiusAdd + radiusAddExtra;
    this.durationMs = this.baseDurationMs * durationMul * durationMulExtra;
    this.projectiles = this.baseProjectiles + projectilesAdd + projAddExtra;
    this.tickMs = this.baseTickMs * tickMsMul * tickMulExtra;
    this.throwRange = this.baseThrowRange * throwMulExtra;
  }

  update(ctx: WeaponUpdateContext) {
    this.gfx.clear();

    this.timer -= ctx.dtMs;

    if (this.timer <= 0) {
      this.timer = this.cooldownMs;
      this.spawnPools(ctx);
    }

    // update pools
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const p = this.pools[i];
      p.leftMs -= ctx.dtMs;

      p.tickLeftMs -= ctx.dtMs;
      while (p.tickLeftMs <= 0 && p.leftMs > 0) {
        p.tickLeftMs += this.tickMs;
        this.tickPool(p.x, p.y);
      }

      if (p.leftMs <= 0) this.pools.splice(i, 1);
    }

    this.drawPools();
  }

  private spawnPools(ctx: WeaponUpdateContext) {
    const ox = ctx.origin.x;
    const oy = ctx.origin.y;

    const enemies = this.getEnemies();
    const maxCast = Math.min(this.throwRange, 320); // keep pools closer to player

    const inRange = enemies.filter(e => {
      const dx = e.x - ox;
      const dy = e.y - oy;
      return dx * dx + dy * dy <= maxCast * maxCast;
    });

    const count = Math.max(1, this.projectiles);

    for (let i = 0; i < count; i++) {
      // Pick random enemy within range; fallback to aimpoint or forward direction
      const picked = inRange.length ? inRange[Math.floor(Math.random() * inRange.length)] : null;

      let tx: number;
      let ty: number;

      if (picked) {
        tx = picked.x;
        ty = picked.y;
      } else if (ctx.aimPoint) {
        // clamp aim distance
        const dx = ctx.aimPoint.x - ox;
        const dy = ctx.aimPoint.y - oy;
        const len = Math.hypot(dx, dy) || 1;
        const dist = Math.min(maxCast, len);
        tx = ox + (dx / len) * dist;
        ty = oy + (dy / len) * dist;
      } else {
        // drop near player
        const ang = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * (maxCast - 80);
        tx = ox + Math.cos(ang) * dist;
        ty = oy + Math.sin(ang) * dist;
      }

      // small jitter so multiple pools aren't identical
      tx += Phaser.Math.Between(-12, 12);
      ty += Phaser.Math.Between(-12, 12);

      this.pools.push({ x: tx, y: ty, leftMs: this.durationMs, tickLeftMs: 0 });
      this.tickPool(tx, ty);
    }
  }

  private tickPool(x: number, y: number) {
    const r2 = this.radius * this.radius;

    for (const e of this.getEnemies()) {
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= r2 + e.r * e.r) e.takeDamage(this.damage);
    }
  }

  private drawPools() {
    for (const p of this.pools) {
      const pct = Phaser.Math.Clamp(p.leftMs / Math.max(1, this.durationMs), 0, 1);
      const alpha = 0.08 + 0.18 * pct;

      this.gfx.fillStyle(0x2ee6a6, alpha);
      this.gfx.fillCircle(p.x, p.y, this.radius);
      this.gfx.lineStyle(2, 0xe8eef7, 0.12);
      this.gfx.strokeCircle(p.x, p.y, this.radius);
    }
  }

  destroy() {
    this.gfx.destroy();
  }
}
