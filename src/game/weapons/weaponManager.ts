import type { Registries } from '../loadData';

export type WeaponUpdateContext = {
  dtMs: number;
  elapsedSec: number;
  origin: { x: number; y: number };
  aimPoint: { x: number; y: number } | null;
};

export interface IWeapon {
  id: string;
  level: number;
  setLevel(level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }): void;
  update(ctx: WeaponUpdateContext): void;
  destroy(): void;
}

export type WeaponFactory = (data: Registries, scene: Phaser.Scene, spawnProjectile: (p: any) => void, getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>) => IWeapon;

export class WeaponManager {
  private weapons = new Map<string, IWeapon>();

  private data: Registries;
  private scene: Phaser.Scene;
  private spawnProjectile: (p: any) => void;
  private getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>;
  private factories: Record<string, WeaponFactory>;

  constructor(
    data: Registries,
    scene: Phaser.Scene,
    spawnProjectile: (p: any) => void,
    getEnemies: () => Array<{ x: number; y: number; r: number; takeDamage: (dmg: number) => void }>,
    factories: Record<string, WeaponFactory>
  ) {
    this.data = data;
    this.scene = scene;
    this.spawnProjectile = spawnProjectile;
    this.getEnemies = getEnemies;
    this.factories = factories;
  }

  has(id: string) {
    return this.weapons.has(id);
  }

  getLevel(id: string) {
    return this.weapons.get(id)?.level ?? 0;
  }

  addWeapon(id: string, level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    if (this.weapons.has(id)) return;
    const f = this.factories[id];
    if (!f) throw new Error(`No weapon factory for '${id}'`);
    const w = f(this.data, this.scene, this.spawnProjectile, this.getEnemies);
    w.setLevel(level, mods);
    this.weapons.set(id, w);
  }

  setWeaponLevel(id: string, level: number, mods: { damageMul: number; weaponMods?: Record<string, number> }) {
    const w = this.weapons.get(id);
    if (!w) return;
    w.setLevel(level, mods);
  }

  update(ctx: WeaponUpdateContext) {
    for (const w of this.weapons.values()) w.update(ctx);
  }

  removeWeapon(id: string) {
    const w = this.weapons.get(id);
    if (!w) return;
    w.destroy();
    this.weapons.delete(id);
  }

  destroy() {
    for (const w of this.weapons.values()) w.destroy();
    this.weapons.clear();
  }
}
