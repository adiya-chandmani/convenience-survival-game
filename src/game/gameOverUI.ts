import Phaser from 'phaser';
import { t } from './i18n';

export type GameOverStats = {
  difficulty: string;
  elapsedSec: number;
  level: number;
  kills: number;
  weapons: Array<{ name: string; stars: string }>;
  passives: Array<{ name: string; stars: string }>;
};

export class GameOverUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;

  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private bound = false;

  private onRestart: () => void;
  private onQuit: () => void;

  private handleEnter = () => this.onRestart();
  private handleEsc = () => this.onQuit();

  constructor(scene: Phaser.Scene, handlers: { onRestart: () => void; onQuit: () => void }) {
    this.scene = scene;
    this.onRestart = handlers.onRestart;
    this.onQuit = handlers.onQuit;

    const { width, height } = scene.scale;
    this.bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0).setScrollFactor(0);

    this.container = scene.add.container(0, 0, [this.bg]);
    this.container.setScrollFactor(0).setDepth(3300);

    scene.scale.on('resize', (size: any) => {
      this.bg.setSize(size.width, size.height);
      if (this.container.visible) this.render(this._lastStats);
    });

    this.hide();
  }

  private _lastStats: GameOverStats | null = null;

  show(stats: GameOverStats) {
    this._lastStats = stats;
    this.container.setVisible(true);
    this.render(stats);

    const kb = this.scene.input.keyboard;
    if (kb && !this.bound) {
      this.bound = true;
      kb.on('keydown-ENTER', this.handleEnter);
      kb.on('keydown-ESC', this.handleEsc);
    }
  }

  hide() {
    const kb = this.scene.input.keyboard;
    if (kb && this.bound) {
      this.bound = false;
      kb.off('keydown-ENTER', this.handleEnter);
      kb.off('keydown-ESC', this.handleEsc);
    }

    this.container.setVisible(false);
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];
  }

  private render(stats: GameOverStats | null) {
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];
    if (!stats) return;

    const { width, height } = this.scene.scale;

    const cardW = Math.min(760, Math.floor(width * 0.82));
    const cardH = Math.min(560, Math.floor(height * 0.78));
    const x = Math.floor((width - cardW) / 2);
    const y = Math.floor((height - cardH) / 2);

    const card = this.scene.add.rectangle(x, y, cardW, cardH, 0x0b0e12, 0.97).setOrigin(0, 0).setScrollFactor(0);
    card.setStrokeStyle(2, 0x2f4a6a, 1);

    const title = this.scene.add
      .text(width / 2, y + 56, 'GAME OVER', { fontSize: '42px', color: '#ffb3b3', stroke: '#0b0e12', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const meta = this.scene.add
      .text(
        width / 2,
        y + 98,
        `${formatTime(stats.elapsedSec)} · LV ${stats.level} · ${t('gameover.kills')} ${stats.kills} · ${formatDifficulty(stats.difficulty)}`,
        {
          fontSize: '16px',
          color: '#b9c6d6',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    // lists
    const leftX = x + 38;
    const midX = x + Math.floor(cardW / 2) + 10;
    const listY = y + 140;

    const wTitle = this.scene
      .add.text(leftX, listY, `${t('ui.weapon')} (${stats.weapons.length}/6)`, { fontSize: '18px', color: '#e8eef7' })
      .setScrollFactor(0);
    const wBody = this.scene.add
      .text(leftX, listY + 28, stats.weapons.length ? stats.weapons.map(w => `${w.name}  ${w.stars}`).join('\n') : '—', {
        fontSize: '15px',
        color: '#b9c6d6',
        lineSpacing: 6,
        wordWrap: { width: Math.floor(cardW / 2) - 60 },
      })
      .setScrollFactor(0);

    const pTitle = this.scene
      .add.text(midX, listY, `${t('ui.passive')} (${stats.passives.length}/6)`, { fontSize: '18px', color: '#e8eef7' })
      .setScrollFactor(0);
    const pBody = this.scene.add
      .text(midX, listY + 28, stats.passives.length ? stats.passives.map(p => `${p.name}  ${p.stars}`).join('\n') : '—', {
        fontSize: '15px',
        color: '#b9c6d6',
        lineSpacing: 6,
        wordWrap: { width: Math.floor(cardW / 2) - 60 },
      })
      .setScrollFactor(0);

    // buttons
    const btnY = y + cardH - 72;
    const restartBtn = this.makeButton(width / 2 - 150, btnY, 260, 46, t('gameover.restart'), 0xffc857, () => this.onRestart());
    const quitBtn = this.makeButton(width / 2 + 150, btnY, 260, 46, t('gameover.quit'), 0xff4d6d, () => this.onQuit());

    this.container.add([card, title, meta, wTitle, wBody, pTitle, pBody, restartBtn, quitBtn]);
    this.dynamic.push(card, title, meta, wTitle, wBody, pTitle, pBody, restartBtn, quitBtn);
  }

  private makeButton(cx: number, cy: number, w: number, h: number, label: string, accent: number, onClick: () => void) {
    const rect = this.scene.add.rectangle(cx, cy, w, h, 0x0b0e12, 0.92).setOrigin(0.5).setScrollFactor(0);
    rect.setStrokeStyle(2, 0x2f4a6a, 1);

    const glow = this.scene.add.rectangle(cx, cy, w + 6, h + 6, accent, 0.08).setOrigin(0.5).setScrollFactor(0);

    const txt = this.scene.add
      .text(cx, cy, label, {
        fontSize: '18px',
        color: '#e8eef7',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const zone = this.scene.add.zone(cx - w / 2, cy - h / 2, w, h).setOrigin(0, 0).setScrollFactor(0);
    zone.setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      rect.setStrokeStyle(3, accent, 1);
      glow.setFillStyle(accent, 0.14);
      txt.setColor('#ffffff');
    });

    zone.on('pointerout', () => {
      rect.setStrokeStyle(2, 0x2f4a6a, 1);
      glow.setFillStyle(accent, 0.08);
      txt.setColor('#e8eef7');
    });

    zone.on('pointerdown', () => {
      (this.scene.game.canvas as HTMLCanvasElement)?.focus?.();
      onClick();
    });

    return this.scene.add.container(0, 0, [glow, rect, txt, zone]);
  }
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDifficulty(d: string) {
  if (d === 'easy') return t('gameover.difficulty.easy');
  if (d === 'hard') return t('gameover.difficulty.hard');
  return t('gameover.difficulty.normal');
}
