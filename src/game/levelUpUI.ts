import Phaser from 'phaser';

export type UpgradeOptionBase = {
  kind: string;
  id: string;
  title: string;
  desc: string;
  curLevel?: number;
  nextLevel?: number;
  maxLevel?: number;
  // optional: used for perk/mod choices
  modId?: string;
  modKey?: string;
  modOp?: 'add' | 'mul';
  modValue?: number;
};

export type UpgradeOption =
  | (UpgradeOptionBase & { kind: 'weapon_new' })
  | (UpgradeOptionBase & { kind: 'weapon_upgrade' })
  | (UpgradeOptionBase & { kind: 'weapon_mod' })
  | (UpgradeOptionBase & { kind: 'passive_new' })
  | (UpgradeOptionBase & { kind: 'passive_upgrade' });

function iconColor(opt: UpgradeOption) {
  if (opt.kind.startsWith('weapon')) return 0x9ad1ff;
  if (opt.kind.startsWith('passive')) return 0xffc857;
  return 0xe8eef7;
}

function formatStars(opt: UpgradeOption) {
  const max = Math.max(0, Number(opt.maxLevel ?? 0));
  const next = Math.max(0, Number(opt.nextLevel ?? 0));
  if (!max || !next) return '';

  const filled = Math.min(max, next);
  const empty = Math.max(0, max - filled);
  return `${'★'.repeat(filled)}${'☆'.repeat(empty)}`;
}

export class LevelUpUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;

  private cardZones: Phaser.GameObjects.Zone[] = [];
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];
  private options: UpgradeOption[] = [];

  private cardCount = 3;

  private onPick: (opt: UpgradeOption) => void;

  constructor(scene: Phaser.Scene, onPick: (opt: UpgradeOption) => void) {
    this.scene = scene;
    this.onPick = onPick;

    const { width, height } = scene.scale;
    this.bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0, 0);
    this.title = scene.add.text(width / 2, 80, 'LEVEL UP', { fontSize: '28px', color: '#e8eef7' }).setOrigin(0.5);

    this.container = scene.add.container(0, 0, [this.bg, this.title]);
    this.container.setScrollFactor(0).setDepth(3000);

    scene.scale.on('resize', (size: any) => {
      this.bg.setSize(size.width, size.height);
      this.title.setPosition(size.width / 2, 80);
      if (this.container.visible) this.layoutCards();
    });

    this.hide();
  }

  show(options: UpgradeOption[]) {
    this.options = options;
    this.container.setVisible(true);
    this.container.setActive(true);

    this.layoutCards();

    // keyboard 1/2/3
    const kb = this.scene.input.keyboard;
    kb?.once('keydown-ONE', () => this.pick(0));
    kb?.once('keydown-TWO', () => this.pick(1));
    kb?.once('keydown-THREE', () => this.pick(2));
  }

  hide() {
    this.container.setVisible(false);
    this.container.setActive(false);

    for (const z of this.cardZones) z.destroy();
    this.cardZones = [];

    for (const o of this.dynamicObjects) o.destroy();
    this.dynamicObjects = [];
  }

  private layoutCards() {
    // clear old
    for (const z of this.cardZones) z.destroy();
    this.cardZones = [];

    for (const o of this.dynamicObjects) o.destroy();
    this.dynamicObjects = [];

    const { width, height } = this.scene.scale;
    const count = Math.max(3, Math.min(this.cardCount, this.options.length || this.cardCount));

    const cardW = Math.min(380, Math.floor(width * 0.29));
    const cardH = 220;
    const gap = Math.floor(cardW * 0.07);

    const totalW = cardW * count + gap * (count - 1);
    const startX = Math.floor((width - totalW) / 2);
    const y = Math.floor(height / 2 - cardH / 2);

    for (let i = 0; i < count; i++) {
      const x = startX + i * (cardW + gap);
      const opt = this.options[i];

      const rect = this.scene.add.rectangle(x, y, cardW, cardH, 0x0b0e12, 0.92).setOrigin(0, 0).setScrollFactor(0);
      rect.setStrokeStyle(2, 0x2f4a6a, 1);

      const hotkey = this.scene.add.text(x + 12, y + 10, String(i + 1), { fontSize: '16px', color: '#9ad1ff' }).setScrollFactor(0);

      const icon = this.scene.add.circle(x + 26, y + 52, 10, iconColor(opt), 1).setScrollFactor(0);
      const title = this.scene.add
        .text(x + 46, y + 38, opt?.title ?? '—', {
          fontSize: '17px',
          color: '#e8eef7',
          wordWrap: { width: cardW - 62 },
        })
        .setScrollFactor(0);
      // prevent overflow: fixed box + wrap
      title.setFixedSize(cardW - 62, 40);

      const desc = this.scene.add
        .text(x + 12, y + 82, opt?.desc ?? '', {
          fontSize: '13px',
          color: '#b9c6d6',
          wordWrap: { width: cardW - 24 },
          lineSpacing: 2,
        })
        .setScrollFactor(0);
      desc.setFixedSize(cardW - 24, cardH - 130);

      const stars = this.scene.add
        .text(x + 12, y + cardH - 30, formatStars(opt), {
          fontSize: '14px',
          color: '#ffdd88',
        })
        .setScrollFactor(0);

      const zone = this.scene.add.zone(x, y, cardW, cardH).setOrigin(0, 0).setScrollFactor(0);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => rect.setStrokeStyle(3, 0x9ad1ff, 1));
      zone.on('pointerout', () => rect.setStrokeStyle(2, 0x2f4a6a, 1));
      zone.on('pointerdown', () => this.pick(i));

      this.container.add([rect, hotkey, icon, title, desc, stars, zone]);
      this.cardZones.push(zone);
      this.dynamicObjects.push(rect, hotkey, icon, title, desc, stars, zone);
    }
  }

  private pick(i: number) {
    const opt = this.options[i];
    if (!opt) return;
    this.onPick(opt);
  }
}
