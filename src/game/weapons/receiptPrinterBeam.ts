import type { Registries } from '../loadData';
import { BarcodeLaser } from './barcodeLaser';

// Reuse BarcodeLaser implementation with different id/defs.
export class ReceiptPrinterBeam extends BarcodeLaser {
  id = 'receipt_printer_beam';

  constructor(data: Registries, scene: Phaser.Scene, getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>) {
    super(data as any, scene as any, getEnemies as any);
    // BarcodeLaser reads this.id in constructor, so we need to re-init.
    // easiest: overwrite def & stats here.
    (this as any).def = data.weaponsById.get(this.id) as any;
    if (!(this as any).def) throw new Error('Missing weapon receipt_printer_beam');

    const def: any = (this as any).def;
    (this as any).baseCooldownMs = Number(def.base.cooldownMs ?? 1700);
    (this as any).baseDamage = Number(def.base.damage ?? 10);
    (this as any).range = Number(def.base.range ?? 860);
    (this as any).width = Number(def.base.width ?? 22);
    (this as any).beamDurationMs = Number(def.base.beamDurationMs ?? 260);
    (this as any).cooldownMs = (this as any).baseCooldownMs;
    (this as any).damage = (this as any).baseDamage;
  }
}
