import Phaser from 'phaser';

export type EnemyDef = {
  id: string;
  name: string;
  kind: string;
  size: number;
  hp: number;
  speed: number;
  contactDamage: number;
  xpValue?: number;
};

function colorByKind(kind: string) {
  switch (kind) {
    case 'chaser':
      return 0xff7a7a;
    case 'chaser_fast':
      return 0xffc857;
    case 'chaser_tank':
      return 0x6b7cff;
    case 'chaser_swarm':
      return 0xc56cff;
    case 'exploder':
      return 0xff4d6d;
    case 'ranged':
      return 0x2ee6a6;
    case 'elite':
      return 0xffd166;
    case 'boss':
      return 0xff2d55;
    default:
      return 0xff7a7a;
  }
}

export class Enemy {
  public readonly def: EnemyDef;
  public readonly sprite: Phaser.GameObjects.Arc;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public contactDamage: number;

  private baseFill: number;

  private slowMul = 1;
  private slowLeftMs = 0;

  private flashLeftMs = 0;

  constructor(scene: Phaser.Scene, def: EnemyDef, x: number, y: number, scalars?: { hpMul?: number; speedMul?: number; dmgMul?: number }) {
    this.def = def;

    const hpMul = scalars?.hpMul ?? 1;
    const speedMul = scalars?.speedMul ?? 1;
    const dmgMul = scalars?.dmgMul ?? 1;

    this.maxHp = Math.max(1, Math.round(def.hp * hpMul));
    this.hp = this.maxHp;
    this.speed = def.speed * speedMul;
    this.contactDamage = Math.max(1, Math.round(def.contactDamage * dmgMul));

    const fill = colorByKind(def.kind);
    this.baseFill = fill;
    this.sprite = scene.add.circle(x, y, def.size, fill, 1) as Phaser.GameObjects.Arc;
    this.sprite.setDepth(9);
  }

  applySlow(mul: number, durationMs: number) {
    // mul < 1 => slower
    if (!(mul > 0)) return;
    // keep the stronger slow (smaller mul)
    if (this.slowLeftMs > 0) this.slowMul = Math.min(this.slowMul, mul);
    else this.slowMul = mul;
    this.slowLeftMs = Math.max(this.slowLeftMs, durationMs);
  }

  hitFlash(durationMs = 90) {
    this.flashLeftMs = Math.max(this.flashLeftMs, durationMs);
    this.sprite.setFillStyle(0xffffff, 1);
  }

  updateChase(dtSec: number, targetX: number, targetY: number) {
    if (this.slowLeftMs > 0) {
      this.slowLeftMs = Math.max(0, this.slowLeftMs - dtSec * 1000);
      if (this.slowLeftMs <= 0) this.slowMul = 1;
    }

    if (this.flashLeftMs > 0) {
      this.flashLeftMs = Math.max(0, this.flashLeftMs - dtSec * 1000);
      if (this.flashLeftMs <= 0) this.sprite.setFillStyle(this.baseFill, 1);
    }

    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    const spd = this.speed * (this.slowMul || 1);
    this.sprite.x += nx * spd * dtSec;
    this.sprite.y += ny * spd * dtSec;
  }

  destroy() {
    this.sprite.destroy();
  }
}
