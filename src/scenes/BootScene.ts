import Phaser from 'phaser';
import { loadAllFromUrl } from '../game/loadData';
import { setRegistry } from '../game/dataRegistry';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Placeholder: load sprites later.
  }

  async create() {
    const text = this.add.text(24, 24, 'Loading data…', { fontSize: '20px', color: '#e8eef7' });

    try {
      const data = await loadAllFromUrl('/game-data/mvp_v1');
      setRegistry(data);
      text.setText('Loaded.');
      this.scene.start('MainMenu');
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      text.setText(`Load failed:\n${msg}`);
      console.error(e);
    }
  }
}
