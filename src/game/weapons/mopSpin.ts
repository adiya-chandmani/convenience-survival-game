import Phaser from 'phaser';
import type { Registries } from '../loadData';
import type { IWeapon, WeaponUpdateContext } from './weaponManager';

export class MopSpin implements IWeapon {
  id = 'mop_spin';
  level = 1;

  private timer = 0;
  private def: any;

  private baseCooldownMs: number;
  private baseDamage: number;
  private baseRadius: number;
  private baseBlades: number;
  private hitCooldownMs: number;
  private baseAngularSpeedDeg: number;

  private cooldownMs: number;
  private damage: number;
  private radius: number;
  private blades: number;
  private angularSpeedDeg: number;
  private angleRad = 0;

  private gfx: Phaser.GameObjects.Graphics;
  private lastHitAt = new Map<any, number>();

  private getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>;

  constructor(data: Registries, scene: Phaser.Scene, getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>) {
    this.getEnemies = getEnemies;
    this.def = data.weaponsById.get(this.id) as any;
    if (!this.def) throw new Error('Missing weapon mop_spin');

    this.baseCooldownMs = Number(this.def.base.cooldownMs ?? 900);
    this.baseDamage = Number(this.def.base.damage ?? 6);
    this.baseRadius = Number(this.def.base.radius ?? 66);
    this.baseBlades = Number(this.def.base.blades ?? 1);
    this.hitCooldownMs = Number(this.def.base.hitCooldownMs ?? 220);
    this.baseAngularSpeedDeg = Number(this.def.base.angularSpeedDeg ?? 260);

    this.cooldownMs = this.baseCooldownMs;
    this.damage = this.baseDamage;
    this.radius = this.baseRadius;
    this.blades = this.baseBlades;
    this.angularSpeedDeg = this.baseAngularSpeedDeg;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(7);
  }

  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    this.level = level;

    let damageMul = 1;
    let cooldownMul = 1;
    let bladesAdd = 0;
    let radiusAdd = 0;
    let angSpeedMul = 1;

    for (const s of (this.def.scales ?? []) as any[]) {
      if (Number(s.level) <= level) {
        if (s.damageMul) damageMul *= Number(s.damageMul);
        if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
        if (s.bladesAdd) bladesAdd += Number(s.bladesAdd);
        if (s.radiusAdd) radiusAdd += Number(s.radiusAdd);
        if (s.angularSpeedMul) angSpeedMul *= Number(s.angularSpeedMul);
      }
    }

    const wm = mods.weaponMods ?? {};
    const dmgMulExtra = wm.damageMul ?? 1;
    const cdMulExtra = wm.cooldownMul ?? 1;
    const bladesAddExtra = wm.bladesAdd ?? 0;
    const radiusAddExtra = wm.radiusAdd ?? 0;
    const angMulExtra = wm.angularSpeedMul ?? 1;

    this.damage = this.baseDamage * damageMul * (mods.damageMul ?? 1) * dmgMulExtra;
    this.cooldownMs = this.baseCooldownMs * cooldownMul * cdMulExtra;
    this.blades = this.baseBlades + bladesAdd + bladesAddExtra;
    this.radius = this.baseRadius + radiusAdd + radiusAddExtra;
    this.angularSpeedDeg = this.baseAngularSpeedDeg * angSpeedMul * angMulExtra;
  }

  update(ctx: WeaponUpdateContext) {
    // Visual: watery ring + mop heads
    this.gfx.clear();
    const ox = ctx.origin.x;
    const oy = ctx.origin.y;

    this.gfx.lineStyle(3, 0x2ee6a6, 0.12);
    this.gfx.strokeCircle(ox, oy, this.radius);

    const angVel = Phaser.Math.DegToRad(this.angularSpeedDeg);
    this.angleRad = Phaser.Math.Angle.Wrap(this.angleRad + angVel * (ctx.dtMs / 1000));

    const bladeCount = Math.max(1, this.blades);
    for (let i = 0; i < bladeCount; i++) {
      const a = this.angleRad + (i * Math.PI * 2) / bladeCount;
      const bx = ox + Math.cos(a) * this.radius;
      const by = oy + Math.sin(a) * this.radius;

      this.gfx.fillStyle(0x2ee6a6, 0.22);
      this.gfx.fillCircle(bx, by, 8);
      this.gfx.lineStyle(2, 0xe8eef7, 0.22);
      this.gfx.strokeCircle(bx, by, 8);
    }

    // Damage tick
    this.timer -= ctx.dtMs;
    if (this.timer > 0) return;
    this.timer = this.cooldownMs;

    const enemies = this.getEnemies();
    const now = performance.now();
    const r = this.radius;

    for (const e of enemies) {
      const dx = e.x - ox;
      const dy = e.y - oy;
      if (dx * dx + dy * dy > (r + e.r) * (r + e.r)) continue;

      const last = this.lastHitAt.get(e) ?? -1e9;
      if (now - last < this.hitCooldownMs) continue;
      this.lastHitAt.set(e, now);

      e.takeDamage(this.damage * Math.min(2, bladeCount));
    }
  }

  destroy() {
    this.gfx.destroy();
    this.lastHitAt.clear();
  }
}
