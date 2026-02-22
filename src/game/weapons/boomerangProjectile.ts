import Phaser from 'phaser';

// Projectile with out-and-back motion.
export class BoomerangProjectile {
  public readonly sprite: Phaser.GameObjects.Arc;
  public damage: number;
  public pierceLeft: number;
  public readonly r: number;

  private ageMs = 0;
  private lifeMs: number;

  private ox: number;
  private oy: number;
  private vx: number;
  private vy: number;
  private range: number;
  private speed: number;

  constructor(
    scene: Phaser.Scene,
    origin: { x: number; y: number },
    dir: { x: number; y: number },
    cfg: { damage: number; pierce: number; lifeMs: number; r: number; speed: number; range: number }
  ) {
    this.damage = cfg.damage;
    this.pierceLeft = cfg.pierce;
    this.lifeMs = cfg.lifeMs;
    this.r = cfg.r;
    this.ox = origin.x;
    this.oy = origin.y;
    this.speed = cfg.speed;
    this.range = cfg.range;

    this.vx = dir.x * this.speed;
    this.vy = dir.y * this.speed;

    this.sprite = scene.add.circle(origin.x, origin.y, cfg.r, 0xe8d7a8, 1) as Phaser.GameObjects.Arc;
    this.sprite.setDepth(8);
  }

  update(dtMs: number) {
    this.ageMs += dtMs;

    // Determine phase by distance from origin
    const dx0 = this.sprite.x - this.ox;
    const dy0 = this.sprite.y - this.oy;
    const d0 = Math.hypot(dx0, dy0);

    // Outward until range, then return
    if (d0 >= this.range) {
      const dx = this.ox - this.sprite.x;
      const dy = this.oy - this.sprite.y;
      const len = Math.hypot(dx, dy) || 1;
      this.vx = (dx / len) * this.speed;
      this.vy = (dy / len) * this.speed;
    }

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
