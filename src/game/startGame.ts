import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';

export function startGame(mountEl: HTMLElement) {
  mountEl.innerHTML = '';

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: mountEl,
    width: 1280,
    height: 720,
    backgroundColor: '#0b0e12',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    },
    scene: [BootScene, MainMenuScene, GameScene]
  };

  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}
