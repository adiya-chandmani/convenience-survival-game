import Phaser from 'phaser';
import { getLang, setLang, t, type Lang } from '../game/i18n';

export class MainMenuScene extends Phaser.Scene {
  private enterKey!: Phaser.Input.Keyboard.Key;

  private bgGfx!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; r: number; v: number; a: number }> = [];

  private ui!: Phaser.GameObjects.Container;
  private debugTxt!: Phaser.GameObjects.Text;

  private helpOpen = false;
  private helpContainer!: Phaser.GameObjects.Container;

  private difficulty: 'easy' | 'normal' | 'hard' = 'normal';
  private diffLabel!: Phaser.GameObjects.Text;
  private diffBtns: Record<string, Phaser.GameObjects.Container> = {};

  private langLabel!: Phaser.GameObjects.Text;
  private langBtns: Record<string, Phaser.GameObjects.Container> = {};

  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.bgGfx = this.add.graphics().setDepth(1);
    this.makeStars(width, height);

    // UI root
    this.ui = this.add.container(0, 0).setDepth(10);

    const title = this.add
      .text(width / 2, Math.floor(height * 0.28), t('menu.title'), {
        fontSize: '42px',
        color: '#e8eef7',
        stroke: '#0b0e12',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(width / 2, title.y + 44, t('menu.subtitle'), {
        fontSize: '16px',
        color: '#b9c6d6',
      })
      .setOrigin(0.5);

    // difficulty (persist)
    const saved = (globalThis as any)?.localStorage?.getItem?.('mvp_game.difficulty');
    if (saved === 'easy' || saved === 'normal' || saved === 'hard') this.difficulty = saved;

    // Layout: keep consistent spacing across resolutions
    const contentTop = Math.floor(height * 0.46);

    const startY = contentTop;
    const startBtn = this.makeButton(width / 2, startY, 380, 58, t('menu.start'), 0x9ad1ff, () => this.startGame());

    // difficulty selector row
    const diffLabelY = startY + 86;
    const diffRowY = diffLabelY + 34;

    this.diffLabel = this.add.text(width / 2, diffLabelY, t('menu.difficulty'), { fontSize: '14px', color: '#b9c6d6' }).setOrigin(0.5);

    const bw = 112;
    const gap = 14;
    const rowW = bw * 3 + gap * 2;
    const sx = width / 2 - rowW / 2 + bw / 2;

    this.diffBtns.easy = this.makeButton(sx + 0 * (bw + gap), diffRowY, bw, 40, t('menu.easy'), 0x2ee6a6, () => this.setDifficulty('easy'));
    this.diffBtns.normal = this.makeButton(sx + 1 * (bw + gap), diffRowY, bw, 40, t('menu.normal'), 0xffc857, () => this.setDifficulty('normal'));
    this.diffBtns.hard = this.makeButton(sx + 2 * (bw + gap), diffRowY, bw, 40, t('menu.hard'), 0xff4d6d, () => this.setDifficulty('hard'));

    // language selector row (menu)
    const langLabelY = diffRowY + 68;
    const langRowY = langLabelY + 34;

    this.langLabel = this.add.text(width / 2, langLabelY, t('settings.language'), { fontSize: '14px', color: '#b9c6d6' }).setOrigin(0.5);

    const curLang = getLang();
    const bw2 = 160;
    const gap2 = 14;
    const sx2 = width / 2 - (bw2 * 2 + gap2) / 2 + bw2 / 2;

    const mkLangBtn = (x0: number, lang: Lang, label: string, accent: number) => {
      const c = this.makeButton(x0, langRowY, bw2, 40, label, accent, () => {
        setLang(lang);
        this.scene.restart();
      });
      c.setAlpha(curLang === lang ? 1 : 0.72);
      return c;
    };

    this.langBtns.ko = mkLangBtn(sx2, 'ko', t('settings.lang.ko'), 0x2ee6a6);
    this.langBtns.en = mkLangBtn(sx2 + (bw2 + gap2), 'en', t('settings.lang.en'), 0x9ad1ff);

    const helpY = langRowY + 86;
    const helpBtn = this.makeButton(width / 2, helpY, 380, 46, t('menu.help'), 0xffc857, () => this.toggleHelp());

    const hint = this.add
      .text(width / 2, helpY + 72, t('menu.hint'), {
        fontSize: '14px',
        color: '#b9c6d6',
      })
      .setOrigin(0.5);

    this.debugTxt = this.add.text(12, height - 18, 'menu ready', { fontSize: '12px', color: '#6b7a90' }).setOrigin(0, 1);

    // Help overlay (hidden by default)
    this.helpContainer = this.buildHelpOverlay(width, height);
    this.helpContainer.setVisible(false);

    this.ui.add([
      title,
      subtitle,
      startBtn,
      this.diffLabel,
      this.diffBtns.easy,
      this.diffBtns.normal,
      this.diffBtns.hard,
      this.langLabel,
      this.langBtns.ko,
      this.langBtns.en,
      helpBtn,
      hint,
      this.debugTxt,
      this.helpContainer,
    ]);

    this.refreshDifficultyUI();

    // input
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.helpOpen) this.toggleHelp(false);
    });

    // resize
    this.scale.on('resize', (size: any) => {
      const w = size.width;
      const h = size.height;
      this.debugTxt.setPosition(12, h - 18);
      this.makeStars(w, h);
      // rebuild layout simply by restarting scene (menu is light)
      this.scene.restart();
    });
  }

  update(_t: number, dtMs: number) {
    // Enter
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.startGame();
    }

    // animate bg
    this.drawBackground(dtMs);
  }

  private startGame() {
    this.debugTxt.setText(`starting… (${this.difficulty})`);
    console.log('[MainMenu] starting GameScene', { difficulty: this.difficulty });
    try {
      this.scene.start('Game', { difficulty: this.difficulty });
    } catch (e) {
      console.error(e);
      this.debugTxt.setText('start failed: ' + String((e as any)?.message ?? e));
    }
  }

  private setDifficulty(d: 'easy' | 'normal' | 'hard') {
    this.difficulty = d;
    try {
      (globalThis as any)?.localStorage?.setItem?.('mvp_game.difficulty', d);
    } catch {}
    this.refreshDifficultyUI();
  }

  private refreshDifficultyUI() {
    // cheap highlight: fake hover state by adjusting alpha
    const keys: Array<'easy' | 'normal' | 'hard'> = ['easy', 'normal', 'hard'];
    for (const k of keys) {
      const c = this.diffBtns[k];
      if (!c) continue;
      c.setAlpha(k === this.difficulty ? 1 : 0.72);
    }
  }

  private makeButton(
    cx: number,
    cy: number,
    w: number,
    h: number,
    label: string,
    accent: number,
    onClick: () => void
  ) {
    const rect = this.add.rectangle(cx, cy, w, h, 0x0b0e12, 0.92).setOrigin(0.5);
    rect.setStrokeStyle(2, 0x2f4a6a, 1);

    const glow = this.add.rectangle(cx, cy, w + 6, h + 6, accent, 0.08).setOrigin(0.5);

    const txt = this.add
      .text(cx, cy, label, {
        fontSize: '18px',
        color: '#e8eef7',
      })
      .setOrigin(0.5);

    const zone = this.add.zone(cx - w / 2, cy - h / 2, w, h).setOrigin(0, 0);
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
      (this.game.canvas as HTMLCanvasElement)?.focus?.();
      onClick();
    });

    // container
    return this.add.container(0, 0, [glow, rect, txt, zone]);
  }

  private buildHelpOverlay(width: number, height: number) {
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0);

    const cardW = Math.min(720, Math.floor(width * 0.78));
    const cardH = Math.min(420, Math.floor(height * 0.62));
    const x = Math.floor((width - cardW) / 2);
    const y = Math.floor((height - cardH) / 2);

    const card = this.add.rectangle(x, y, cardW, cardH, 0x0b0e12, 0.96).setOrigin(0, 0);
    card.setStrokeStyle(2, 0x2f4a6a, 1);

    const title = this.add.text(width / 2, y + 36, t('help.title'), { fontSize: '24px', color: '#e8eef7' }).setOrigin(0.5);

    const body = t('help.body');

    const txt = this.add
      .text(x + 28, y + 82, body, {
        fontSize: '16px',
        color: '#b9c6d6',
        lineSpacing: 6,
        wordWrap: { width: cardW - 56 },
      })
      .setOrigin(0, 0);

    const closeBtn = this.makeButton(width / 2, y + cardH - 46, 260, 44, t('help.close'), 0xff4fd8, () => this.toggleHelp(false));

    return this.add.container(0, 0, [bg, card, title, txt, closeBtn]).setDepth(50);
  }

  private toggleHelp(force?: boolean) {
    this.helpOpen = force ?? !this.helpOpen;
    this.helpContainer.setVisible(this.helpOpen);
  }

  private makeStars(width: number, height: number) {
    // regenerate if needed
    this.stars = [];
    const n = Math.floor(Math.min(140, Math.max(60, (width * height) / 18000)));
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 1.8,
        v: 18 + Math.random() * 50,
        a: 0.08 + Math.random() * 0.22,
      });
    }
  }

  private drawBackground(dtMs: number) {
    const { width, height } = this.scale;

    // base
    this.bgGfx.clear();
    this.bgGfx.fillStyle(0x070a10, 1);
    this.bgGfx.fillRect(0, 0, width, height);

    // subtle vignette-ish bars
    this.bgGfx.fillStyle(0x0b0e12, 0.65);
    this.bgGfx.fillRect(0, 0, width, 80);
    this.bgGfx.fillRect(0, height - 80, width, 80);

    // moving stars
    const dt = dtMs / 1000;
    for (const s of this.stars) {
      s.y += s.v * dt;
      if (s.y > height + 10) {
        s.y = -10;
        s.x = Math.random() * width;
      }
      this.bgGfx.fillStyle(0xe8eef7, s.a);
      this.bgGfx.fillCircle(s.x, s.y, s.r);
    }

    // accent glow blob
    this.bgGfx.fillStyle(0x9ad1ff, 0.06);
    this.bgGfx.fillCircle(width * 0.2, height * 0.35, Math.min(width, height) * 0.28);
    this.bgGfx.fillStyle(0xff4fd8, 0.05);
    this.bgGfx.fillCircle(width * 0.78, height * 0.6, Math.min(width, height) * 0.22);
  }
}
