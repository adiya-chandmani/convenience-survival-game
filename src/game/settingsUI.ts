import Phaser from 'phaser';
import { getLang, setLang, t, type Lang } from './i18n';

export class SettingsUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;

  private dynamic: Phaser.GameObjects.GameObject[] = [];

  private onResume: () => void;
  private onRestart: () => void;
  private onQuit: () => void;

  private bound = false;
  private handleEsc = () => this.onResume();
  private handleR = () => this.onRestart();
  private handleQ = () => this.onQuit();

  constructor(scene: Phaser.Scene, handlers: { onResume: () => void; onRestart: () => void; onQuit: () => void }) {
    this.scene = scene;
    this.onResume = handlers.onResume;
    this.onRestart = handlers.onRestart;
    this.onQuit = handlers.onQuit;

    const { width, height } = scene.scale;

    this.bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0, 0).setScrollFactor(0);
    this.title = scene.add
      .text(width / 2, 120, t('settings.title'), { fontSize: '28px', color: '#e8eef7' })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.container = scene.add.container(0, 0, [this.bg, this.title]);
    this.container.setScrollFactor(0).setDepth(3200);

    scene.scale.on('resize', (size: any) => {
      this.bg.setSize(size.width, size.height);
      this.title.setPosition(size.width / 2, 120);
      if (this.container.visible) this.layout();
    });

    this.hide();
  }

  show() {
    this.container.setVisible(true);
    this.layout();

    // Hotkeys (bind/unbind cleanly so ESC keeps working after clicking buttons)
    const kb = this.scene.input.keyboard;
    if (kb && !this.bound) {
      this.bound = true;
      kb.on('keydown-ESC', this.handleEsc);
      kb.on('keydown-R', this.handleR);
      kb.on('keydown-Q', this.handleQ);
    }
  }

  hide() {
    // Unbind hotkeys
    const kb = this.scene.input.keyboard;
    if (kb && this.bound) {
      this.bound = false;
      kb.off('keydown-ESC', this.handleEsc);
      kb.off('keydown-R', this.handleR);
      kb.off('keydown-Q', this.handleQ);
    }

    this.container.setVisible(false);
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];
  }

  private layout() {
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];

    const { width, height } = this.scene.scale;

    const cardW = Math.min(520, Math.floor(width * 0.6));
    const cardH = 420;
    const x = Math.floor((width - cardW) / 2);
    const y = Math.floor(height / 2 - cardH / 2);

    const card = this.scene.add.rectangle(x, y, cardW, cardH, 0x0b0e12, 0.96).setOrigin(0, 0).setScrollFactor(0);
    card.setStrokeStyle(2, 0x2f4a6a, 1);

    // ensure title matches current language
    this.title.setText(t('settings.title'));

    const help = this.scene.add
      .text(width / 2, y + 60, t('settings.hotkeys'), {
        fontSize: '16px',
        color: '#b9c6d6',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Language row
    const langY = y + 160;
    const label = this.scene.add.text(width / 2, langY - 26, t('settings.language'), { fontSize: '14px', color: '#b9c6d6' }).setOrigin(0.5).setScrollFactor(0);

    const bw = 160;
    const gap = 14;
    const sx = width / 2 - (bw * 2 + gap) / 2 + bw / 2;

    const cur = getLang();
    const mkLangBtn = (x0: number, lang: Lang, text: string, accent: number) => {
      const c = this.makeButton(x0, langY, bw, 40, text, accent, () => {
        setLang(lang);
        this.layout();
      });
      c.setAlpha(cur === lang ? 1 : 0.72);
      return c;
    };

    const koBtn = mkLangBtn(sx, 'ko', t('settings.lang.ko'), 0x2ee6a6);
    const enBtn = mkLangBtn(sx + (bw + gap), 'en', t('settings.lang.en'), 0x9ad1ff);

    const btnY0 = y + 240;
    const btnW = Math.min(360, Math.floor(cardW * 0.75));

    const resumeBtn = this.makeButton(width / 2, btnY0, btnW, 50, t('settings.resume'), 0x9ad1ff, () => this.onResume());
    const restartBtn = this.makeButton(width / 2, btnY0 + 62, btnW, 44, t('settings.restart'), 0xffc857, () => this.onRestart());
    const quitBtn = this.makeButton(width / 2, btnY0 + 118, btnW, 44, t('settings.quit'), 0xff4d6d, () => this.onQuit());

    this.container.add([card, help, label, koBtn, enBtn, resumeBtn, restartBtn, quitBtn]);
    this.dynamic.push(card, help, label, koBtn, enBtn, resumeBtn, restartBtn, quitBtn);
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
