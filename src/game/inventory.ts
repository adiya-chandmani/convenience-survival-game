import type { Registries } from './loadData';

export type WeaponInstance = { id: string; level: number };
export type PassiveInstance = { id: string; level: number };

export class Inventory {
  weapons: WeaponInstance[] = [];
  passives: PassiveInstance[] = [];

  // per-weapon mod stacks (chosen via weapon_mod cards)
  weaponMods = new Map<string, Record<string, number>>();

  constructor() {}

  hasWeapon(id: string) {
    return this.weapons.some(w => w.id === id);
  }

  getWeaponLevel(id: string) {
    return this.weapons.find(w => w.id === id)?.level ?? 0;
  }

  setWeaponLevel(id: string, level: number) {
    const w = this.weapons.find(x => x.id === id);
    if (w) w.level = level;
    else this.weapons.push({ id, level });
  }

  getWeaponMods(id: string) {
    return this.weaponMods.get(id) ?? {};
  }

  addWeaponMod(id: string, key: string, delta: number) {
    const cur = { ...(this.weaponMods.get(id) ?? {}) };
    cur[key] = (cur[key] ?? 0) + delta;
    this.weaponMods.set(id, cur);
  }

  mulWeaponMod(id: string, key: string, mul: number) {
    const cur = { ...(this.weaponMods.get(id) ?? {}) };
    const v = cur[key] ?? 1;
    cur[key] = v * mul;
    this.weaponMods.set(id, cur);
  }

  hasPassive(id: string) {
    return this.passives.some(p => p.id === id);
  }

  getPassiveLevel(id: string) {
    return this.passives.find(p => p.id === id)?.level ?? 0;
  }

  setPassiveLevel(id: string, level: number) {
    const p = this.passives.find(x => x.id === id);
    if (p) p.level = level;
    else this.passives.push({ id, level });
  }

  removePassiveAt(index: number) {
    this.passives.splice(index, 1);
  }

  removeWeaponAt(index: number) {
    this.weapons.splice(index, 1);
  }

  recomputeStats(data: Registries) {
    let damageMul = 1;
    let moveSpeedMul = 1;

    for (const p of this.passives) {
      const def = data.passivesById.get(p.id) as any;
      if (!def) continue;
      const entry = (def.stats ?? []).find((s: any) => s.level === p.level) ?? def.stats?.[def.stats.length - 1];
      if (!entry) continue;
      if (entry.damageMul) damageMul *= Number(entry.damageMul);
      if (entry.moveSpeedMul) moveSpeedMul *= Number(entry.moveSpeedMul);
    }

    return { damageMul, moveSpeedMul };
  }
}
