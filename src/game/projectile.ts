import Phaser from 'phaser';

export class Projectile {
  public readonly sprite: Phaser.GameObjects.Arc;
  public vx: number;
  public vy: number;
  public damage: number;
  public pierceLeft: number;
  public lifeMs: number;
  private ageMs = 0;
  public readonly r: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
    cfg: { damage: number; pierce: number; lifeMs: number; r: number; color?: number }
  ) {
    this.vx = vx;
    this.vy = vy;
    this.damage = cfg.damage;
    this.pierceLeft = cfg.pierce;
    this.lifeMs = cfg.lifeMs;
    this.r = cfg.r;

    const col = cfg.color ?? 0xd6f6ff;
    this.sprite = scene.add.circle(x, y, cfg.r, col, 1) as Phaser.GameObjects.Arc;
    this.sprite.setDepth(8);
  }

  update(dtMs: number) {
    this.ageMs += dtMs;
    this.sprite.x += (this.vx * dtMs) / 1000;
    this.sprite.y += (this.vy * dtMs) / 1000;
  }

  get expired() {
    return this.ageMs >= this.lifeMs || this.pierceLeft < 0;
  }

  destroy() {
    this.sprite.destroy();
  }
}
