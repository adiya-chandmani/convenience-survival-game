import Phaser from 'phaser';
import type { Registries } from '../loadData';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

type SlowableEnemy = { x: number; y: number; r: number; takeDamage: (dmg: number) => void; applySlow?: (mul: number, durationMs: number) => void };

export class IceCupSlowField implements IWeapon {
  id = 'ice_cup_slow_field';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private baseDurationMs: number;
  private baseRadius: number;
  private baseTickMs: number;
  private baseSlowMul: number;
  private baseSlowDurationMs: number;

  private cooldownMs: number;
  private damage: number;
  private durationMs: number;
  private radius: number;
  private tickMs: number;
  private slowMul: number;
  private slowDurationMs: number;

  private fieldLeftMs = 0;
  private tickLeftMs = 0;
  private fieldPos: { x: number; y: number } | null = null;

  private gfx: Phaser.GameObjects.Graphics;
  private getEnemies: () => SlowableEnemy[];

  constructor(data: Registries, scene: Phaser.Scene, getEnemies: () => SlowableEnemy[]) {
    this.getEnemies = getEnemies;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon ice_cup_slow_field');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 2400);
    this.baseDamage = Number(this.def.base.damage ?? 3);
    this.baseDurationMs = Number(this.def.base.durationMs ?? 2800);
    this.baseRadius = Number(this.def.base.radius ?? 84);
    this.baseTickMs = Number(this.def.base.tickMs ?? 250);
    this.baseSlowMul = Number(this.def.base.slowMul ?? 0.7);
    this.baseSlowDurationMs = Number(this.def.base.slowDurationMs ?? 600);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.durationMs = this.baseDurationMs;
    this.radius = this.baseRadius;
    this.tickMs = this.baseTickMs;
    this.slowMul = this.baseSlowMul;
    this.slowDurationMs = this.baseSlowDurationMs;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(7);
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let durationMul = 1;
    let radiusAdd = 0;
    let tickMsMul = 1;
    let slowMulMul = 1;
    let slowDurationMul = 1;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (Number(s.level) <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.durationMul) durationMul *= Number(s.durationMul);
        if (s.radiusAdd) radiusAdd += Number(s.radiusAdd);
        if (s.tickMsMul) tickMsMul *= Number(s.tickMsMul);
        if (s.slowMulMul) slowMulMul *= Number(s.slowMulMul);
        if (s.slowDurationMul) slowDurationMul *= Number(s.slowDurationMul);
      }
    }

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const radiusAddExtra = wm.radiusAdd ?? 0;
    const durationMulExtra = wm.durationMul ?? 1;
    const tickMulExtra = wm.tickMsMul ?? 1;
    const slowMulMulExtra = wm.slowMulMul ?? 1;
    const slowDurMulExtra = wm.slowDurationMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.durationMs = this.baseDurationMs * durationMul * durationMulExtra;
    this.radius = this.baseRadius + radiusAdd + radiusAddExtra;
    this.tickMs = this.baseTickMs * tickMsMul * tickMulExtra;
    this.slowMul = this.baseSlowMul * slowMulMul * slowMulMulExtra;
    this.slowDurationMs = this.baseSlowDurationMs * slowDurationMul * slowDurMulExtra;
  }

  update(ctx: WeaponUpdateContext) {
    this.gfx.clear();

    this.timer -= ctx.dtMs;

    // Start field near aim (fallback to origin) — original behavior
    if (this.timer <= 0) {
      this.timer = this.cooldownMs;
      const p = ctx.aimPoint ?? ctx.origin;
      this.fieldPos = { x: p.x, y: p.y };
      this.fieldLeftMs = this.durationMs;
      this.tickLeftMs = 0;
    }

    if (!this.fieldPos || this.fieldLeftMs <= 0) return;

    this.fieldLeftMs -= ctx.dtMs;

    // ticks
    this.tickLeftMs -= ctx.dtMs;
    while (this.tickLeftMs <= 0 && this.fieldLeftMs > 0) {
      this.tickLeftMs += this.tickMs;
      this.tick();
    }

    this.draw();
  }

  private tick() {
    if (!this.fieldPos) return;

    const r = this.radius;
    const r2 = r * r;

    for (const e of this.getEnemies()) {
      const dx = e.x - this.fieldPos.x;
      const dy = e.y - this.fieldPos.y;
      if (dx * dx + dy * dy <= r2 + e.r * e.r) {
        e.takeDamage(this.damage);
        e.applySlow?.(this.slowMul, this.slowDurationMs);
      }
    }
  }

  private draw() {
    if (!this.fieldPos) return;

    const pct = Phaser.Math.Clamp(this.fieldLeftMs / Math.max(1, this.durationMs), 0, 1);
    const alpha = 0.10 + 0.20 * pct;

    this.gfx.fillStyle(0x7ad1ff, alpha);
    this.gfx.fillCircle(this.fieldPos.x, this.fieldPos.y, this.radius);

    this.gfx.lineStyle(2, 0xe8eef7, 0.18);
    this.gfx.strokeCircle(this.fieldPos.x, this.fieldPos.y, this.radius);
  }

  destroy() {
    this.gfx.destroy();
  }
}
