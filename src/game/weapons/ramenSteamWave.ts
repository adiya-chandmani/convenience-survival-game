import Phaser from 'phaser';
import type { Registries } from '../loadData';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class RamenSteamWave implements IWeapon {
  id = 'ramen_steam_wave';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private baseAngleDeg: number;
  private baseRange: number;
  private baseTickMs: number;
  private baseTicks: number;

  private cooldownMs: number;
  private damage: number;
  private angleDeg: number;
  private range: number;
  private tickMs: number;
  private ticks: number;

  private activeLeft = 0;
  private tickLeftMs = 0;

  private gfx: Phaser.GameObjects.Graphics;
  private getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>;

  constructor(
    data: Registries,
    scene: Phaser.Scene,
    getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>
  ) {
    this.getEnemies = getEnemies;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon ramen_steam_wave');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 1200);
    this.baseDamage = Number(this.def.base.damage ?? 9);
    this.baseAngleDeg = Number(this.def.base.angleDeg ?? 90);
    this.baseRange = Number(this.def.base.range ?? 160);
    this.baseTickMs = Number(this.def.base.tickMs ?? 120);
    this.baseTicks = Number(this.def.base.ticks ?? 4);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.angleDeg = this.baseAngleDeg;
    this.range = this.baseRange;
    this.tickMs = this.baseTickMs;
    this.ticks = this.baseTicks;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(8);
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let rangeAdd = 0;
    let ticksAdd = 0;
    let angleAdd = 0;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (Number(s.level) <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.rangeAdd) rangeAdd += Number(s.rangeAdd);
        if (s.ticksAdd) ticksAdd += Number(s.ticksAdd);
        if (s.angleAdd) angleAdd += Number(s.angleAdd);
      }
    }

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const rangeAddExtra = wm.rangeAdd ?? 0;
    const ticksAddExtra = wm.ticksAdd ?? 0;
    const angleAddExtra = wm.angleAdd ?? 0;
    const tickMulExtra = wm.tickMsMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.range = this.baseRange + rangeAdd + rangeAddExtra;
    this.ticks = this.baseTicks + ticksAdd + ticksAddExtra;
    this.angleDeg = this.baseAngleDeg + angleAdd + angleAddExtra;
    this.tickMs = this.baseTickMs * tickMulExtra;
  }

  update(ctx: WeaponUpdateContext) {
    this.gfx.clear();

    this.timer -= ctx.dtMs;

    // Start new wave
    if (this.timer <= 0 && ctx.aimPoint) {
      this.timer = this.cooldownMs;
      this.activeLeft = Math.max(1, this.ticks);
      this.tickLeftMs = 0; // immediate tick
    }

    if (this.activeLeft <= 0) return;
    if (!ctx.aimPoint) return;

    // Tick loop
    this.tickLeftMs -= ctx.dtMs;
    while (this.tickLeftMs <= 0 && this.activeLeft > 0) {
      this.tickLeftMs += this.tickMs;
      this.activeLeft -= 1;
      this.damageTick(ctx);
    }

    // Draw while active (simple cone)
    this.draw(ctx, Phaser.Math.Clamp(this.activeLeft / Math.max(1, this.ticks), 0, 1));
  }

  private damageTick(ctx: WeaponUpdateContext) {
    if (!ctx.aimPoint) return;

    const ox = ctx.origin.x;
    const oy = ctx.origin.y;
    const dx = ctx.aimPoint.x - ox;
    const dy = ctx.aimPoint.y - oy;
    const ang0 = Math.atan2(dy, dx);

    const half = Phaser.Math.DegToRad(this.angleDeg / 2);
    const r2 = this.range * this.range;

    for (const e of this.getEnemies()) {
      const ex = e.x - ox;
      const ey = e.y - oy;
      const d2 = ex * ex + ey * ey;
      if (d2 > r2 + e.r * e.r) continue;

      const ang = Math.atan2(ey, ex);
      const da = Phaser.Math.Angle.Wrap(ang - ang0);
      if (Math.abs(da) <= half) e.takeDamage(this.damage);
    }
  }

  private draw(ctx: WeaponUpdateContext, intensity01: number) {
    if (!ctx.aimPoint) return;

    const ox = ctx.origin.x;
    const oy = ctx.origin.y;
    const dx = ctx.aimPoint.x - ox;
    const dy = ctx.aimPoint.y - oy;
    const ang0 = Math.atan2(dy, dx);
    const half = Phaser.Math.DegToRad(this.angleDeg / 2);

    const a1 = ang0 - half;
    const a2 = ang0 + half;

    const alpha = 0.12 + 0.18 * intensity01;
    const col = 0xffffff;

    this.gfx.fillStyle(col, alpha);
    this.gfx.beginPath();
    this.gfx.moveTo(ox, oy);
    this.gfx.arc(ox, oy, this.range, a1, a2, false);
    this.gfx.closePath();
    this.gfx.fillPath();

    this.gfx.lineStyle(2, 0xe8eef7, 0.22);
    this.gfx.beginPath();
    this.gfx.moveTo(ox, oy);
    this.gfx.arc(ox, oy, this.range, a1, a2, false);
    this.gfx.closePath();
    this.gfx.strokePath();
  }

  destroy() {
    this.gfx.destroy();
  }
}
