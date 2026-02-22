import Phaser from 'phaser';
import type { Registries } from '../loadData';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class CouponRain implements IWeapon {
  id = 'coupon_rain';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private baseDurationMs: number;
  private baseRadius: number;
  private baseTickMs: number;

  private cooldownMs: number;
  private damage: number;
  private durationMs: number;
  private radius: number;
  private tickMs: number;

  private fieldLeftMs = 0;
  private tickLeftMs = 0;
  private fieldPos: { x: number; y: number } | null = null;

  private gfx: Phaser.GameObjects.Graphics;
  private getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>;

  constructor(data: Registries, scene: Phaser.Scene, getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>) {
    this.getEnemies = getEnemies;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon coupon_rain');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 2100);
    this.baseDamage = Number(this.def.base.damage ?? 4);
    this.baseDurationMs = Number(this.def.base.durationMs ?? 2600);
    this.baseRadius = Number(this.def.base.radius ?? 92);
    this.baseTickMs = Number(this.def.base.tickMs ?? 220);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.durationMs = this.baseDurationMs;
    this.radius = this.baseRadius;
    this.tickMs = this.baseTickMs;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(6);
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let durationMul = 1;
    let radiusAdd = 0;
    let tickMsMul = 1;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (Number(s.level) <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.durationMul) durationMul *= Number(s.durationMul);
        if (s.radiusAdd) radiusAdd += Number(s.radiusAdd);
        if (s.tickMsMul) tickMsMul *= Number(s.tickMsMul);
      }
    }

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const radiusAddExtra = wm.radiusAdd ?? 0;
    const durationMulExtra = wm.durationMul ?? 1;
    const tickMulExtra = wm.tickMsMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.durationMs = this.baseDurationMs * durationMul * durationMulExtra;
    this.radius = this.baseRadius + radiusAdd + radiusAddExtra;
    this.tickMs = this.baseTickMs * tickMsMul * tickMulExtra;
  }

  update(ctx: WeaponUpdateContext) {
    this.gfx.clear();

    this.timer -= ctx.dtMs;
    // store field position per cast
    if (this.timer <= 0) {
      this.timer = this.cooldownMs;
      this.fieldLeftMs = this.durationMs;
      this.tickLeftMs = 0;

      const ox = ctx.origin.x;
      const oy = ctx.origin.y;
      const maxCast = 360;

      const enemies = this.getEnemies();
      const inRange = enemies.filter(e => {
        const dx = e.x - ox;
        const dy = e.y - oy;
        return dx * dx + dy * dy <= maxCast * maxCast;
      });
      const picked = inRange.length ? inRange[Math.floor(Math.random() * inRange.length)] : null;

      if (picked) this.fieldPos = { x: picked.x, y: picked.y };
      else if (ctx.aimPoint) {
        const dx = ctx.aimPoint.x - ox;
        const dy = ctx.aimPoint.y - oy;
        const len = Math.hypot(dx, dy) || 1;
        const dist = Math.min(maxCast, len);
        this.fieldPos = { x: ox + (dx / len) * dist, y: oy + (dy / len) * dist };
      } else this.fieldPos = { x: ox, y: oy };
    }

    if (this.fieldLeftMs <= 0 || !this.fieldPos) return;

    this.fieldLeftMs -= ctx.dtMs;

    // ticks
    this.tickLeftMs -= ctx.dtMs;
    while (this.tickLeftMs <= 0 && this.fieldLeftMs > 0) {
      this.tickLeftMs += this.tickMs;
      this.tick(this.fieldPos.x, this.fieldPos.y);
    }

    this.draw(this.fieldPos.x, this.fieldPos.y);
  }

  private tick(x: number, y: number) {
    const r2 = this.radius * this.radius;
    for (const e of this.getEnemies()) {
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= r2 + e.r * e.r) e.takeDamage(this.damage);
    }
  }

  private draw(x: number, y: number) {
    const pct = Phaser.Math.Clamp(this.fieldLeftMs / Math.max(1, this.durationMs), 0, 1);
    const alpha = 0.06 + 0.14 * pct;

    // ring
    this.gfx.lineStyle(2, 0xff4fd8, 0.18 + 0.12 * pct);
    this.gfx.strokeCircle(x, y, this.radius);

    // falling coupon streaks
    const n = 10;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * this.radius;
      const px = x + Math.cos(ang) * r;
      const py = y + Math.sin(ang) * r;
      this.gfx.lineStyle(2, 0xff4fd8, alpha);
      this.gfx.beginPath();
      this.gfx.moveTo(px, py - 10);
      this.gfx.lineTo(px, py + 10);
      this.gfx.strokePath();
    }
  }

  destroy() {
    this.gfx.destroy();
  }
}
