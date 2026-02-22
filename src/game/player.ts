import Phaser from 'phaser';

export type PlayerConfig = {
  x: number;
  y: number;
  moveSpeed: number; // px/sec
  radius: number;
};

export type PlayerState = {
  x: number;
  y: number;
  r: number;
};

export class Player {
  public readonly sprite: Phaser.GameObjects.Arc;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private moveSpeed: number;
  private radius: number;
  private facing = { x: 1, y: 0 };

  constructor(scene: Phaser.Scene, cfg: PlayerConfig) {
    this.moveSpeed = cfg.moveSpeed;
    this.radius = cfg.radius;

    // Simple placeholder visual.
    this.sprite = scene.add.circle(cfg.x, cfg.y, cfg.radius, 0x5fd3ff, 1) as Phaser.GameObjects.Arc;
    this.sprite.setDepth(10);

    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard input not available');

    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      LEFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      DOWN: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      RIGHT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      SHIFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };
  }

  getState(): PlayerState {
    return { x: this.sprite.x, y: this.sprite.y, r: this.radius };
  }

  getFacing() {
    return { x: this.facing.x, y: this.facing.y };
  }

  setPos(x: number, y: number) {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  setMoveSpeed(v: number) {
    this.moveSpeed = v;
  }

  update(dtSec: number) {
    let dx = 0;
    let dy = 0;

    if (this.keys.W.isDown || this.keys.UP.isDown) dy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) dy += 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx += 1;

    if (dx === 0 && dy === 0) return;

    // Normalize diagonal.
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;

    this.facing.x = dx;
    this.facing.y = dy;

    const sprintMul = this.keys.SHIFT.isDown ? 1.15 : 1.0;
    const speed = this.moveSpeed * sprintMul;

    this.sprite.x += dx * speed * dtSec;
    this.sprite.y += dy * speed * dtSec;
  }
}
