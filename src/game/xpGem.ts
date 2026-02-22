import Phaser from 'phaser';

export class XpGem {
  public readonly sprite: Phaser.GameObjects.Arc;
  public value: number;
  public r: number;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    this.value = value;
    this.r = value >= 20 ? 6 : value >= 5 ? 5 : 4;
    const col = value >= 20 ? 0xc56cff : value >= 5 ? 0x4cc8ff : 0x7cff7c;
    this.sprite = scene.add.circle(x, y, this.r, col, 1) as Phaser.GameObjects.Arc;
    this.sprite.setDepth(3);
  }

  destroy() {
    this.sprite.destroy();
  }
}
