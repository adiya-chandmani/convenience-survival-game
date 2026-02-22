import Phaser from 'phaser';
import type { Registries } from '../loadData';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class BarcodeLaser implements IWeapon {
  id = 'barcode_laser';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private range: number;
  private width: number;
  private beamDurationMs: number;

  private cooldownMs: number;
  private damage: number;

  private beamLeftMs = 0;
  private gfx: Phaser.GameObjects.Graphics;

  private getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>;

  constructor(
    data: Registries,
    scene: Phaser.Scene,
    getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>
  ) {
    this.getEnemies = getEnemies;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon barcode_laser');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 1500);
    this.baseDamage = Number(this.def.base.damage ?? 8);
    this.range = Number(this.def.base.range ?? 820);
    this.width = Number(this.def.base.width ?? 18);
    this.beamDurationMs = Number(this.def.base.beamDurationMs ?? 220);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(8);
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let widthAdd = 0;
    let beamDurMul = 1;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (s.level <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.widthAdd) widthAdd += Number(s.widthAdd);
        if (s.beamDurationMul) beamDurMul *= Number(s.beamDurationMul);
      }
    }

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const widthAddExtra = wm.widthAdd ?? 0;
    const beamDurMulExtra = wm.beamDurationMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.width = Number(this.def.base.width ?? 18) + widthAdd + widthAddExtra;
    this.beamDurationMs = Number(this.def.base.beamDurationMs ?? 220) * beamDurMul * beamDurMulExtra;
  }

  update(ctx: WeaponUpdateContext) {
    this.gfx.clear();

    this.timer -= ctx.dtMs;
    if (this.timer <= 0 && ctx.aimPoint) {
      this.timer = this.cooldownMs;
      this.beamLeftMs = this.beamDurationMs;

      // apply immediate damage tick
      this.fire(ctx);
    }

    if (this.beamLeftMs > 0 && ctx.aimPoint) {
      this.beamLeftMs -= ctx.dtMs;
      this.draw(ctx);
    }
  }

  private fire(ctx: WeaponUpdateContext) {
    if (!ctx.aimPoint) return;

    const ox = ctx.origin.x;
    const oy = ctx.origin.y;
    const dx = ctx.aimPoint.x - ox;
    const dy = ctx.aimPoint.y - oy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    const ex = ox + nx * this.range;
    const ey = oy + ny * this.range;

    // Distance point-to-segment for each enemy; if within beam width, hit.
    const enemies = this.getEnemies();
    const half = this.width / 2;

    for (const e of enemies) {
      const d = distPointToSegment(e.x, e.y, ox, oy, ex, ey);
      if (d <= half + e.r) e.takeDamage(this.damage);
    }
  }

  private draw(ctx: WeaponUpdateContext) {
    if (!ctx.aimPoint) return;

    const ox = ctx.origin.x;
    const oy = ctx.origin.y;
    const dx = ctx.aimPoint.x - ox;
    const dy = ctx.aimPoint.y - oy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    const ex = ox + nx * this.range;
    const ey = oy + ny * this.range;

    this.gfx.lineStyle(this.width, 0x9ad1ff, 0.18);
    this.gfx.beginPath();
    this.gfx.moveTo(ox, oy);
    this.gfx.lineTo(ex, ey);
    this.gfx.strokePath();

    this.gfx.lineStyle(2, 0xe8eef7, 0.35);
    this.gfx.beginPath();
    this.gfx.moveTo(ox, oy);
    this.gfx.lineTo(ex, ey);
    this.gfx.strokePath();
  }

  destroy() {
    this.gfx.destroy();
  }
}

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;

  const c1 = wx * vx + wy * vy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);

  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);

  const t = c1 / c2;
  const bx = x1 + t * vx;
  const by = y1 + t * vy;
  return Math.hypot(px - bx, py - by);
}
