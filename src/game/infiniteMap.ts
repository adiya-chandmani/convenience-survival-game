import Phaser from 'phaser';

export type InfiniteMapConfig = {
  tileSize: number;
};

// MVP infinite map: use a repeating TileSprite with a procedurally generated texture.
// This gives the "infinite" feeling without chunk management yet.
export class InfiniteMap {
  private readonly scene: Phaser.Scene;
  private readonly tile: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene, cfg: InfiniteMapConfig) {
    this.scene = scene;

    const texKey = 'storeTile32';
    if (!scene.textures.exists(texKey)) {
      this.generateStoreTileTexture(texKey, cfg.tileSize);
    }

    const { width, height } = scene.scale;
    this.tile = scene.add.tileSprite(0, 0, width, height, texKey);
    this.tile.setOrigin(0, 0);
    this.tile.setScrollFactor(0);
    this.tile.setDepth(0);
  }

  resize() {
    const { width, height } = this.scene.scale;
    this.tile.setSize(width, height);
  }

  update(camera: Phaser.Cameras.Scene2D.Camera) {
    // Move the texture as the camera scrolls.
    this.tile.tilePositionX = camera.scrollX;
    this.tile.tilePositionY = camera.scrollY;
  }

  private generateStoreTileTexture(key: string, tileSize: number) {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // Base floor.
    g.fillStyle(0x111821, 1);
    g.fillRect(0, 0, tileSize, tileSize);

    // Subtle grid.
    g.lineStyle(1, 0x1c2a3a, 1);
    g.strokeRect(0.5, 0.5, tileSize - 1, tileSize - 1);

    // Aisle stripe hint.
    g.fillStyle(0x0c1118, 1);
    g.fillRect(0, Math.floor(tileSize * 0.42), tileSize, Math.ceil(tileSize * 0.16));

    // Tiny specular dots.
    g.fillStyle(0x172233, 1);
    g.fillCircle(tileSize * 0.25, tileSize * 0.25, 1);
    g.fillCircle(tileSize * 0.7, tileSize * 0.6, 1);

    g.generateTexture(key, tileSize, tileSize);
    g.destroy();
  }
}
