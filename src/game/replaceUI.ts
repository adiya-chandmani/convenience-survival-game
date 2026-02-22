import Phaser from 'phaser';

export class ReplaceUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;

  private zones: Phaser.GameObjects.Zone[] = [];
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { width, height } = scene.scale;
    this.bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0, 0).setScrollFactor(0);
    this.title = scene.add
      .text(width / 2, 80, '교체할 패시브 선택', { fontSize: '22px', color: '#e8eef7' })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.container = scene.add.container(0, 0, [this.bg, this.title]);
    this.container.setScrollFactor(0).setDepth(3100);

    scene.scale.on('resize', (size: any) => {
      this.bg.setSize(size.width, size.height);
      this.title.setPosition(size.width / 2, 80);
    });

    this.hide();
  }

  show(items: Array<{ name: string; level: number }>, onPickIndex: (idx: number) => void, titleText = '교체할 패시브 선택') {
    this.hide();
    this.container.setVisible(true);

    this.title.setText(titleText);

    const { width, height } = this.scene.scale;
    const w = Math.min(520, Math.floor(width * 0.55));
    const itemH = 44;
    const x = Math.floor((width - w) / 2);
    const y0 = Math.floor(height / 2 - (items.length * itemH) / 2);

    for (let i = 0; i < items.length; i++) {
      const y = y0 + i * itemH;
      const rect = this.scene.add.rectangle(x, y, w, itemH - 6, 0x0b0e12, 0.92).setOrigin(0, 0).setScrollFactor(0);
      rect.setStrokeStyle(2, 0x2f4a6a, 1);

      const txt = this.scene
        .add.text(x + 12, y + 10, `${i + 1}. ${items[i].name} (Lv.${items[i].level})`, {
          fontSize: '16px',
          color: '#e8eef7',
        })
        .setScrollFactor(0);

      const z = this.scene.add.zone(x, y, w, itemH - 6).setOrigin(0, 0).setScrollFactor(0);
      z.setInteractive({ useHandCursor: true });
      z.on('pointerover', () => rect.setStrokeStyle(3, 0xff4fd8, 1));
      z.on('pointerout', () => rect.setStrokeStyle(2, 0x2f4a6a, 1));
      z.on('pointerdown', () => onPickIndex(i));

      this.container.add([rect, txt, z]);
      this.zones.push(z);
      this.dynamicObjects.push(rect, txt, z);
    }

    // keyboard 1..6
    const kb = this.scene.input.keyboard;
    const keyCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
    ];
    for (let i = 0; i < Math.min(6, items.length); i++) {
      kb?.once(`keydown-${keyCodes[i]}`, () => onPickIndex(i));
    }
  }

  hide() {
    this.container.setVisible(false);

    for (const z of this.zones) z.destroy();
    this.zones = [];

    for (const o of this.dynamicObjects) o.destroy();
    this.dynamicObjects = [];
  }
}
