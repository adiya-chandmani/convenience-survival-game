import type { Registries } from './loadData';
import type { Inventory } from './inventory';
import type { UpgradeOption } from './levelUpUI';
import { t, weaponName, passiveName } from './i18n';

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatPassiveDelta(def: any, fromLevel: number, toLevel: number) {
  const from = (def.stats ?? []).find((s: any) => s.level === fromLevel) ?? {};
  const to = (def.stats ?? []).find((s: any) => s.level === toLevel) ?? {};

  const lines: string[] = [];
  const addMul = (label: string, mul: number) => {
    lines.push(`${label} +${Math.round((mul - 1) * 100)}%`);
  };

  if (to.damageMul && to.damageMul !== from.damageMul) addMul(t('stat.damage'), Number(to.damageMul));
  if (to.moveSpeedMul && to.moveSpeedMul !== from.moveSpeedMul) addMul(t('stat.move_speed'), Number(to.moveSpeedMul));
  if (to.attackSpeedMul && to.attackSpeedMul !== from.attackSpeedMul) addMul(t('stat.attack_speed'), Number(to.attackSpeedMul));
  if (to.cooldownMul && to.cooldownMul !== from.cooldownMul) lines.push(`${t('stat.cooldown')} -${Math.round((1 - Number(to.cooldownMul)) * 100)}%`);
  if (to.magnetMul && to.magnetMul !== from.magnetMul) addMul(t('stat.pickup_range'), Number(to.magnetMul));
  if (to.armorAdd && to.armorAdd !== from.armorAdd) lines.push(`${t('stat.armor')} +${to.armorAdd}`);
  if (to.luckAdd && to.luckAdd !== from.luckAdd) lines.push(`${t('stat.luck')} +${to.luckAdd}`);
  if (to.coinGainMul && to.coinGainMul !== from.coinGainMul) addMul(t('stat.gold'), Number(to.coinGainMul));

  return lines.length ? lines.join('\n') : t('ui.generic_upgrade_passive');
}

function applyWeaponScales(def: any, level: number) {
  const base = def.base ?? {};

  // Start with base stats
  let damage = Number(base.damage ?? 0);
  let cooldownMs = Number(base.cooldownMs ?? 0);

  // various counts
  let projectiles = Number(base.projectiles ?? base.pellets ?? base.blades ?? 1);
  let pierce = Number(base.pierce ?? 0);

  // geometry/area
  let width = Number(base.width ?? 0);
  let radius = Number(base.radius ?? 0);

  // extra stats (optional per weapon)
  let durationMs = Number(base.durationMs ?? 0);
  let tickMs = Number(base.tickMs ?? 0);
  let spreadDeg = Number(base.spreadDeg ?? 0);
  let angularSpeedDeg = Number(base.angularSpeedDeg ?? 0);
  let beamDurationMs = Number(base.beamDurationMs ?? 0);
  let slowMul = Number(base.slowMul ?? 0);
  let slowDurationMs = Number(base.slowDurationMs ?? 0);

  // scale accumulators
  let damageMul = 1;
  let cooldownMul = 1;
  let durationMul = 1;
  let tickMsMul = 1;
  let spreadMul = 1;
  let angularSpeedMul = 1;
  let beamDurationMul = 1;
  let slowMulMul = 1;
  let slowDurationMul = 1;

  let projectilesAdd = 0;
  let pelletsAdd = 0;
  let bladesAdd = 0;
  let pierceAdd = 0;
  let widthAdd = 0;
  let radiusAdd = 0;

  for (const s of (def.scales ?? []) as any[]) {
    if (Number(s.level) <= level) {
      if (s.damageMul) damageMul *= Number(s.damageMul);
      if (s.cooldownMul) cooldownMul *= Number(s.cooldownMul);
      if (s.durationMul) durationMul *= Number(s.durationMul);
      if (s.tickMsMul) tickMsMul *= Number(s.tickMsMul);
      if (s.spreadMul) spreadMul *= Number(s.spreadMul);
      if (s.angularSpeedMul) angularSpeedMul *= Number(s.angularSpeedMul);
      if (s.beamDurationMul) beamDurationMul *= Number(s.beamDurationMul);
      if (s.slowMulMul) slowMulMul *= Number(s.slowMulMul);
      if (s.slowDurationMul) slowDurationMul *= Number(s.slowDurationMul);

      if (s.projectilesAdd) projectilesAdd += Number(s.projectilesAdd);
      if (s.pelletsAdd) pelletsAdd += Number(s.pelletsAdd);
      if (s.bladesAdd) bladesAdd += Number(s.bladesAdd);
      if (s.pierceAdd) pierceAdd += Number(s.pierceAdd);
      if (s.widthAdd) widthAdd += Number(s.widthAdd);
      if (s.radiusAdd) radiusAdd += Number(s.radiusAdd);
    }
  }

  damage = damage * damageMul;
  cooldownMs = cooldownMs * cooldownMul;
  durationMs = durationMs * durationMul;
  tickMs = tickMs * tickMsMul;
  spreadDeg = spreadDeg * spreadMul;
  angularSpeedDeg = angularSpeedDeg * angularSpeedMul;
  beamDurationMs = beamDurationMs * beamDurationMul;
  slowMul = slowMul ? slowMul * slowMulMul : 0;
  slowDurationMs = slowDurationMs * slowDurationMul;

  // choose which count to show depending on kind
  const kind = String(def.kind ?? '');
  if (kind === 'spread') projectiles = Number(base.pellets ?? 1) + pelletsAdd;
  else if (kind === 'orbit') projectiles = Number(base.blades ?? 1) + bladesAdd;
  else projectiles = Number(base.projectiles ?? 1) + projectilesAdd;

  pierce = pierce + pierceAdd;
  width = width ? width + widthAdd : widthAdd;
  radius = radius ? radius + radiusAdd : radiusAdd;

  return {
    kind,
    damage,
    cooldownMs,
    projectiles,
    pierce,
    width,
    radius,
    durationMs,
    tickMs,
    spreadDeg,
    angularSpeedDeg,
    beamDurationMs,
    slowMul,
    slowDurationMs,
  };
}

function formatWeaponDelta(def: any, fromLevel: number, toLevel: number) {
  const a = applyWeaponScales(def, fromLevel);
  const b = applyWeaponScales(def, toLevel);

  const lines: string[] = [];

  const pct = (from: number, to: number) => {
    if (!from) return null;
    return Math.round(((to - from) / from) * 100);
  };

  if (b.damage !== a.damage) {
    const p = pct(a.damage, b.damage);
    lines.push(`${t('stat.damage')} ${p !== null ? `+${p}%` : `→ ${Math.round(b.damage)}`}`);
  }

  if (b.cooldownMs !== a.cooldownMs) {
    const p = pct(a.cooldownMs, b.cooldownMs);
    // cooldown decreased => negative percent
    if (p !== null) lines.push(`${t('stat.cooldown')} ${p <= 0 ? `${p}%` : `+${p}%`}`);
  }

  if (b.projectiles !== a.projectiles) {
    const label = b.kind === 'orbit' ? t('stat.blades') : b.kind === 'spread' ? t('stat.pellets') : t('stat.projectiles');
    lines.push(`${label} +${b.projectiles - a.projectiles}`);
  }

  if (b.pierce !== a.pierce) lines.push(`${t('stat.pierce')} +${b.pierce - a.pierce}`);
  if (b.width && b.width !== a.width) lines.push(`${t('stat.width')} +${Math.round(b.width - a.width)}`);
  if (b.radius && b.radius !== a.radius) lines.push(`${t('stat.radius')} +${Math.round(b.radius - a.radius)}`);

  if (b.beamDurationMs && b.beamDurationMs !== a.beamDurationMs) {
    lines.push(`${t('stat.beam_duration')} +${Math.round(b.beamDurationMs - a.beamDurationMs)}ms`);
  }

  if (b.angularSpeedDeg && b.angularSpeedDeg !== a.angularSpeedDeg) {
    const p = pct(a.angularSpeedDeg, b.angularSpeedDeg);
    lines.push(`${t('stat.angular_speed')} ${p !== null ? `+${p}%` : ''}`.trim());
  }

  if (b.durationMs && b.durationMs !== a.durationMs) {
    const p = pct(a.durationMs, b.durationMs);
    lines.push(`${t('stat.duration')} ${p !== null ? `+${p}%` : `→ ${Math.round(b.durationMs)}ms`}`);
  }

  if (b.tickMs && b.tickMs !== a.tickMs) {
    const p = pct(a.tickMs, b.tickMs);
    // lower tickMs => faster
    if (p !== null) lines.push(`${t('stat.tick')} ${p <= 0 ? `${p}%` : `+${p}%`}`);
  }

  if (b.spreadDeg && b.spreadDeg !== a.spreadDeg) {
    const p = pct(a.spreadDeg, b.spreadDeg);
    lines.push(`${t('stat.spread')} ${p !== null ? `${p <= 0 ? '' : '+'}${p}%` : ''}`.trim());
  }

  if (b.slowMul && b.slowMul !== a.slowMul) {
    // slowMul: 0.7 means 30% slow. smaller => stronger.
    const s1 = Math.round((1 - a.slowMul) * 100);
    const s2 = Math.round((1 - b.slowMul) * 100);
    lines.push(`${t('stat.slow')} ${s1}% → ${s2}%`);
  }

  if (b.slowDurationMs && b.slowDurationMs !== a.slowDurationMs) {
    const p = pct(a.slowDurationMs, b.slowDurationMs);
    lines.push(`${t('stat.slow_duration')} ${p !== null ? `+${p}%` : ''}`.trim());
  }

  return lines.length ? lines.join('\n') : t('ui.generic_upgrade');
}

function formatWeaponSummary(def: any) {
  const s = applyWeaponScales(def, 1);
  const lines: string[] = [];
  if (s.damage) lines.push(`${t('stat.damage')} ${Math.round(s.damage)}`);
  if (s.cooldownMs) lines.push(`${t('stat.cooldown')} ${Math.round(s.cooldownMs)}ms`);
  if (s.projectiles) {
    const label = s.kind === 'orbit' ? t('stat.blades') : s.kind === 'spread' ? t('stat.pellets') : t('stat.projectiles');
    lines.push(`${label} ${s.projectiles}`);
  }
  if (s.radius) lines.push(`${t('stat.radius')} ${Math.round(s.radius)}`);
  if (s.width) lines.push(`${t('stat.width')} ${Math.round(s.width)}`);
  if (s.beamDurationMs) lines.push(`${t('stat.beam_duration')} ${Math.round(s.beamDurationMs)}ms`);
  if (s.angularSpeedDeg) lines.push(`${t('stat.angular_speed')} ${Math.round(s.angularSpeedDeg)}`);
  if (s.durationMs) lines.push(`${t('stat.duration')} ${Math.round(s.durationMs)}ms`);
  if (s.tickMs) lines.push(`${t('stat.tick')} ${Math.round(s.tickMs)}ms`);
  if (s.spreadDeg) lines.push(`${t('stat.spread')} ${Math.round(s.spreadDeg)}°`);
  if (s.slowMul) lines.push(`${t('stat.slow')} ${Math.round((1 - s.slowMul) * 100)}%`);
  if (s.slowDurationMs) lines.push(`${t('stat.slow_duration')} ${Math.round(s.slowDurationMs)}ms`);
  return lines.join('\n');
}

export function buildLevelUpOptions(data: Registries, inv: Inventory): UpgradeOption[] {
  const opts: UpgradeOption[] = [];

  // Weapons pool (implemented)
  const weaponPool = [
    'coffee_can_shot',
    'receipt_blade',
    'boxcutter_boomerang',
    'barcode_laser',
    'coin_shotgun',
    'ramen_steam_wave',
    'ice_cup_slow_field',
    'detergent_splash',
    'stapler_burst',
    'mop_spin',
    'price_tag_bomb',
    'receipt_printer_beam',
    'coupon_rain',
  ];

  const notOwnedWeapons = weaponPool.filter(id => !inv.hasWeapon(id));
  const canGetNewWeapon = inv.weapons.length < 6 && notOwnedWeapons.length > 0;

  const upgradableWeapons = weaponPool.filter(id => {
    const def = data.weaponsById.get(id) as any;
    const lvl = inv.getWeaponLevel(id);
    return def && lvl > 0 && lvl < Number(def.maxLevel ?? 8);
  });

  const makeWeaponOption = () => {
    const notOwned = notOwnedWeapons;

    // Prefer new weapon early for build variety
    const rollNew = notOwned.length > 0 && (upgradableWeapons.length === 0 || Math.random() < 0.72);

    if (rollNew) {
      const id = pickRandom(notOwned);
      const def = data.weaponsById.get(id) as any;
      return {
        kind: 'weapon_new' as const,
        id,
        title: `${t('ui.weapon')} ${t('ui.get')}: ${weaponName(id, def.name)}`,
        desc: formatWeaponSummary(def),
        curLevel: 0,
        nextLevel: 1,
        maxLevel: Number(def.maxLevel ?? 8),
      };
    }

    if (upgradableWeapons.length > 0) {
      const id = pickRandom(upgradableWeapons);
      const def = data.weaponsById.get(id) as any;
      const lvl = inv.getWeaponLevel(id);
      return {
        kind: 'weapon_upgrade' as const,
        id,
        title: `${t('ui.weapon')} ${t('ui.upgrade')}: ${weaponName(id, def.name)}`,
        desc: formatWeaponDelta(def, lvl, lvl + 1),
        curLevel: lvl,
        nextLevel: lvl + 1,
        maxLevel: Number(def.maxLevel ?? 8),
      };
    }

    // fallback (should rarely happen)
    const id = pickRandom(weaponPool);
    const def = data.weaponsById.get(id) as any;
    return {
      kind: 'weapon_upgrade' as const,
      id,
      title: `${t('ui.weapon')} ${t('ui.upgrade')}: ${weaponName(id, def?.name ?? id)}`,
      desc: t('ui.generic_upgrade'),
    };
  };

  const passiveIds = Array.from(data.passivesById.keys());

  // Weapon mod/perk cards (single-stat upgrades, not weapon level)
  const wn = (id: string) => weaponName(id, (data.weaponsById.get(id) as any)?.name ?? id);

  const weaponModPool: Array<{ weaponId: string; modId: string; modKey: string; modOp: 'add' | 'mul'; modValue: number; title: string; desc: string; canShow?: (inv: Inventory) => boolean }> = [
    // ---- coffee ----
    { weaponId: 'coffee_can_shot', modId: 'proj+1', modKey: 'projectilesAdd', modOp: 'add', modValue: 1, title: `${wn('coffee_can_shot')}: +1 ${t('stat.projectiles')}`, desc: `+1 ${t('stat.projectiles')}` },
    { weaponId: 'coffee_can_shot', modId: 'dmg+20%', modKey: 'damageMul', modOp: 'mul', modValue: 1.2, title: `${wn('coffee_can_shot')}: +20% ${t('stat.damage')}`, desc: `+20% ${t('stat.damage')}` },
    { weaponId: 'coffee_can_shot', modId: 'cd-10%', modKey: 'cooldownMul', modOp: 'mul', modValue: 0.9, title: `${wn('coffee_can_shot')}: -10% ${t('stat.cooldown')}`, desc: `-10% ${t('stat.cooldown')}` },
    { weaponId: 'coffee_can_shot', modId: 'pierce+1', modKey: 'pierceAdd', modOp: 'add', modValue: 1, title: `${wn('coffee_can_shot')}: +1 ${t('stat.pierce')}`, desc: `+1 ${t('stat.pierce')}` },

    // ---- receipt blade ----
    { weaponId: 'receipt_blade', modId: 'blades+1', modKey: 'bladesAdd', modOp: 'add', modValue: 1, title: `${wn('receipt_blade')}: +1 ${t('stat.blades')}`, desc: `+1 ${t('stat.blades')}` },
    { weaponId: 'receipt_blade', modId: 'radius+10', modKey: 'radiusAdd', modOp: 'add', modValue: 10, title: `${wn('receipt_blade')}: +10 ${t('stat.radius')}`, desc: `+10 ${t('stat.radius')}` },
    { weaponId: 'receipt_blade', modId: 'spin+15%', modKey: 'angularSpeedMul', modOp: 'mul', modValue: 1.15, title: `${wn('receipt_blade')}: +15% ${t('stat.angular_speed')}`, desc: `+15% ${t('stat.angular_speed')}` },
    { weaponId: 'receipt_blade', modId: 'dmg+20%', modKey: 'damageMul', modOp: 'mul', modValue: 1.2, title: `${wn('receipt_blade')}: +20% ${t('stat.damage')}`, desc: `+20% ${t('stat.damage')}` },

    // ---- boxcutter boomerang ----
    { weaponId: 'boxcutter_boomerang', modId: 'proj+1', modKey: 'projectilesAdd', modOp: 'add', modValue: 1, title: `${wn('boxcutter_boomerang')}: +1 ${t('stat.projectiles')}`, desc: `+1 ${t('stat.projectiles')}` },
    { weaponId: 'boxcutter_boomerang', modId: 'range+20%', modKey: 'rangeMul', modOp: 'mul', modValue: 1.2, title: `${wn('boxcutter_boomerang')}: +20% ${t('stat.range')}`, desc: `+20% ${t('stat.range')}` },
    { weaponId: 'boxcutter_boomerang', modId: 'pierce+1', modKey: 'pierceAdd', modOp: 'add', modValue: 1, title: `${wn('boxcutter_boomerang')}: +1 ${t('stat.pierce')}`, desc: `+1 ${t('stat.pierce')}` },
    { weaponId: 'boxcutter_boomerang', modId: 'cd-10%', modKey: 'cooldownMul', modOp: 'mul', modValue: 0.9, title: `${wn('boxcutter_boomerang')}: -10% ${t('stat.cooldown')}`, desc: `-10% ${t('stat.cooldown')}` },

    // ---- barcode laser ----
    { weaponId: 'barcode_laser', modId: 'width+4', modKey: 'widthAdd', modOp: 'add', modValue: 4, title: `${wn('barcode_laser')}: +4 ${t('stat.width')}`, desc: `+4 ${t('stat.width')}` },
    { weaponId: 'barcode_laser', modId: 'beam+20%', modKey: 'beamDurationMul', modOp: 'mul', modValue: 1.2, title: `${wn('barcode_laser')}: +20% ${t('stat.beam_duration')}`, desc: `+20% ${t('stat.beam_duration')}` },
    { weaponId: 'barcode_laser', modId: 'cd-10%', modKey: 'cooldownMul', modOp: 'mul', modValue: 0.9, title: `${wn('barcode_laser')}: -10% ${t('stat.cooldown')}`, desc: `-10% ${t('stat.cooldown')}` },
    { weaponId: 'barcode_laser', modId: 'dmg+20%', modKey: 'damageMul', modOp: 'mul', modValue: 1.2, title: `${wn('barcode_laser')}: +20% ${t('stat.damage')}`, desc: `+20% ${t('stat.damage')}` },

    // ---- coin shotgun ----
    { weaponId: 'coin_shotgun', modId: 'pellets+1', modKey: 'pelletsAdd', modOp: 'add', modValue: 1, title: `${wn('coin_shotgun')}: +1 ${t('stat.pellets')}`, desc: `+1 ${t('stat.pellets')}` },
    { weaponId: 'coin_shotgun', modId: 'range+20%', modKey: 'rangeMul', modOp: 'mul', modValue: 1.2, title: `${wn('coin_shotgun')}: +20% ${t('stat.range')}`, desc: `+20% ${t('stat.range')}` },
    { weaponId: 'coin_shotgun', modId: 'damage+20%', modKey: 'damageMul', modOp: 'mul', modValue: 1.2, title: `${wn('coin_shotgun')}: +20% ${t('stat.damage')}`, desc: `+20% ${t('stat.damage')}` },
    { weaponId: 'coin_shotgun', modId: 'cooldown-10%', modKey: 'cooldownMul', modOp: 'mul', modValue: 0.9, title: `${wn('coin_shotgun')}: -10% ${t('stat.cooldown')}`, desc: `-10% ${t('stat.cooldown')}` },
    { weaponId: 'coin_shotgun', modId: 'spread-10%', modKey: 'spreadMul', modOp: 'mul', modValue: 0.9, title: `${wn('coin_shotgun')}: -10% ${t('stat.spread')}`, desc: `-10% ${t('stat.spread')}` },

    // ---- ramen steam wave ----
    { weaponId: 'ramen_steam_wave', modId: 'range+20', modKey: 'rangeAdd', modOp: 'add', modValue: 20, title: `${wn('ramen_steam_wave')}: +20 ${t('stat.range')}`, desc: `+20 ${t('stat.range')}` },
    { weaponId: 'ramen_steam_wave', modId: 'ticks+1', modKey: 'ticksAdd', modOp: 'add', modValue: 1, title: `${wn('ramen_steam_wave')}: +1 Ticks`, desc: `+1 Ticks` },
    { weaponId: 'ramen_steam_wave', modId: 'angle+15', modKey: 'angleAdd', modOp: 'add', modValue: 15, title: `${wn('ramen_steam_wave')}: +15°`, desc: `+15°` },
    { weaponId: 'ramen_steam_wave', modId: 'tick-10%', modKey: 'tickMsMul', modOp: 'mul', modValue: 0.9, title: `${wn('ramen_steam_wave')}: -10% ${t('stat.tick')}`, desc: `-10% ${t('stat.tick')}` },

    // ---- ice slow field ----
    { weaponId: 'ice_cup_slow_field', modId: 'radius+12', modKey: 'radiusAdd', modOp: 'add', modValue: 12, title: `${wn('ice_cup_slow_field')}: +12 ${t('stat.radius')}`, desc: `+12 ${t('stat.radius')}` },
    { weaponId: 'ice_cup_slow_field', modId: 'slow+10%', modKey: 'slowMulMul', modOp: 'mul', modValue: 0.9, title: `${wn('ice_cup_slow_field')}: +${t('stat.slow')}`, desc: `+${t('stat.slow')}` },
    { weaponId: 'ice_cup_slow_field', modId: 'slowdur+25%', modKey: 'slowDurationMul', modOp: 'mul', modValue: 1.25, title: `${wn('ice_cup_slow_field')}: +25% ${t('stat.slow_duration')}`, desc: `+25% ${t('stat.slow_duration')}` },
    { weaponId: 'ice_cup_slow_field', modId: 'cd-10%', modKey: 'cooldownMul', modOp: 'mul', modValue: 0.9, title: `${wn('ice_cup_slow_field')}: -10% ${t('stat.cooldown')}`, desc: `-10% ${t('stat.cooldown')}` },

    // ---- detergent splash ----
    { weaponId: 'detergent_splash', modId: 'radius+10', modKey: 'radiusAdd', modOp: 'add', modValue: 10, title: `${wn('detergent_splash')}: +10 ${t('stat.radius')}`, desc: `+10 ${t('stat.radius')}` },
    { weaponId: 'detergent_splash', modId: 'dur+20%', modKey: 'durationMul', modOp: 'mul', modValue: 1.2, title: `${wn('detergent_splash')}: +20% ${t('stat.duration')}`, desc: `+20% ${t('stat.duration')}` },
    { weaponId: 'detergent_splash', modId: 'pools+1', modKey: 'projectilesAdd', modOp: 'add', modValue: 1, title: `${wn('detergent_splash')}: +1 Pools`, desc: `+1 Pools` },
    { weaponId: 'detergent_splash', modId: 'tick-10%', modKey: 'tickMsMul', modOp: 'mul', modValue: 0.9, title: `${wn('detergent_splash')}: -10% ${t('stat.tick')}`, desc: `-10% ${t('stat.tick')}` },

    // ---- stapler burst ----
    { weaponId: 'stapler_burst', modId: 'shots+1', modKey: 'burstShotsAdd', modOp: 'add', modValue: 1, title: `${wn('stapler_burst')}: +1 Shots`, desc: `+1 Shots` },
    { weaponId: 'stapler_burst', modId: 'proj+1', modKey: 'projectilesAdd', modOp: 'add', modValue: 1, title: `${wn('stapler_burst')}: +1 ${t('stat.projectiles')}`, desc: `+1 ${t('stat.projectiles')}` },
    { weaponId: 'stapler_burst', modId: 'cd-10%', modKey: 'cooldownMul', modOp: 'mul', modValue: 0.9, title: `${wn('stapler_burst')}: -10% ${t('stat.cooldown')}`, desc: `-10% ${t('stat.cooldown')}` },

    // ---- mop spin ----
    { weaponId: 'mop_spin', modId: 'blades+1', modKey: 'bladesAdd', modOp: 'add', modValue: 1, title: `${wn('mop_spin')}: +1 ${t('stat.blades')}`, desc: `+1 ${t('stat.blades')}` },
    { weaponId: 'mop_spin', modId: 'radius+10', modKey: 'radiusAdd', modOp: 'add', modValue: 10, title: `${wn('mop_spin')}: +10 ${t('stat.radius')}`, desc: `+10 ${t('stat.radius')}` },
    { weaponId: 'mop_spin', modId: 'spin+20%', modKey: 'angularSpeedMul', modOp: 'mul', modValue: 1.2, title: `${wn('mop_spin')}: +20% ${t('stat.angular_speed')}`, desc: `+20% ${t('stat.angular_speed')}` },

    // ---- price tag bomb ----
    { weaponId: 'price_tag_bomb', modId: 'radius+12', modKey: 'radiusAdd', modOp: 'add', modValue: 12, title: `${wn('price_tag_bomb')}: +12 ${t('stat.radius')}`, desc: `+12 ${t('stat.radius')}` },
    { weaponId: 'price_tag_bomb', modId: 'bombs+1', modKey: 'projectilesAdd', modOp: 'add', modValue: 1, title: `${wn('price_tag_bomb')}: +1 Bomb`, desc: `+1 Bomb` },
    { weaponId: 'price_tag_bomb', modId: 'cd-10%', modKey: 'cooldownMul', modOp: 'mul', modValue: 0.9, title: `${wn('price_tag_bomb')}: -10% ${t('stat.cooldown')}`, desc: `-10% ${t('stat.cooldown')}` },

    // ---- receipt printer beam ----
    { weaponId: 'receipt_printer_beam', modId: 'width+4', modKey: 'widthAdd', modOp: 'add', modValue: 4, title: `${wn('receipt_printer_beam')}: +4 ${t('stat.width')}`, desc: `+4 ${t('stat.width')}` },
    { weaponId: 'receipt_printer_beam', modId: 'beam+20%', modKey: 'beamDurationMul', modOp: 'mul', modValue: 1.2, title: `${wn('receipt_printer_beam')}: +20% ${t('stat.beam_duration')}`, desc: `+20% ${t('stat.beam_duration')}` },
    { weaponId: 'receipt_printer_beam', modId: 'dmg+20%', modKey: 'damageMul', modOp: 'mul', modValue: 1.2, title: `${wn('receipt_printer_beam')}: +20% ${t('stat.damage')}`, desc: `+20% ${t('stat.damage')}` },

    // ---- coupon rain ----
    { weaponId: 'coupon_rain', modId: 'radius+12', modKey: 'radiusAdd', modOp: 'add', modValue: 12, title: `${wn('coupon_rain')}: +12 ${t('stat.radius')}`, desc: `+12 ${t('stat.radius')}` },
    { weaponId: 'coupon_rain', modId: 'dur+20%', modKey: 'durationMul', modOp: 'mul', modValue: 1.2, title: `${wn('coupon_rain')}: +20% ${t('stat.duration')}`, desc: `+20% ${t('stat.duration')}` },
    { weaponId: 'coupon_rain', modId: 'tick-10%', modKey: 'tickMsMul', modOp: 'mul', modValue: 0.9, title: `${wn('coupon_rain')}: -10% ${t('stat.tick')}`, desc: `-10% ${t('stat.tick')}` },
  ];

  const addWeaponModOption = () => {
    const owned = weaponModPool.filter(m => inv.hasWeapon(m.weaponId) && (m.canShow ? m.canShow(inv) : true));
    if (!owned.length) return false;

    const m = pickRandom(owned);
    opts.push({
      kind: 'weapon_mod',
      id: m.weaponId,
      modId: m.modId,
      modKey: m.modKey,
      modOp: m.modOp,
      modValue: m.modValue,
      title: m.title,
      desc: m.desc,
      curLevel: inv.getWeaponLevel(m.weaponId),
      nextLevel: inv.getWeaponLevel(m.weaponId),
      maxLevel: Number((data.weaponsById.get(m.weaponId) as any)?.maxLevel ?? 8),
    });
    return true;
  };

  const addPassiveOption = () => {
    // Prefer upgrade if already owned
    const owned = inv.passives.map(p => p.id);
    const canUpgrade = owned.filter(id => {
      const def = data.passivesById.get(id) as any;
      const cur = inv.getPassiveLevel(id);
      return def && cur < Number(def.maxLevel ?? 5);
    });

    const rollUpgrade = canUpgrade.length > 0 && Math.random() < 0.55;

    if (rollUpgrade) {
      const id = pickRandom(canUpgrade);
      const def = data.passivesById.get(id) as any;
      const cur = inv.getPassiveLevel(id);
      opts.push({
        kind: 'passive_upgrade',
        id,
        title: `${t('ui.passive')} ${t('ui.upgrade')}: ${passiveName(id, def.name)}`,
        desc: formatPassiveDelta(def, cur, cur + 1),
        curLevel: cur,
        nextLevel: cur + 1,
        maxLevel: Number(def.maxLevel ?? 5),
      });
      return;
    }

    // New passive
    const notOwned = passiveIds.filter(id => !inv.hasPassive(id));
    const id = pickRandom(notOwned.length ? notOwned : passiveIds);
    const def = data.passivesById.get(id) as any;
    opts.push({
      kind: 'passive_new',
      id,
      title: `${t('ui.passive')} ${t('ui.get')}: ${passiveName(id, def.name)}`,
      desc: formatPassiveDelta(def, 0, 1) + `\n${t('ui.slot_full_replace')}`,
      curLevel: 0,
      nextLevel: 1,
      maxLevel: Number(def.maxLevel ?? 5),
    });
  };

  const TARGET_OPTIONS = 3;

  // Fill to TARGET_OPTIONS options
  while (opts.length < TARGET_OPTIONS) {
    // Weighted random: prefer weapons.
    // Also sprinkle in weapon_mod (single-stat perk) cards for variety.
    const canOfferWeapon = canGetNewWeapon || upgradableWeapons.length > 0;

    const r = Math.random();

    // 62%: weapon new/upgrade
    if (canOfferWeapon && r < 0.62) {
      opts.push(makeWeaponOption());
    }
    // 22%: weapon mod/perk (only if owned weapon supports it)
    else if (r < 0.84) {
      const ok = addWeaponModOption();
      if (!ok) addPassiveOption();
    }
    // 16%: passive
    else {
      addPassiveOption();
    }

    // ensure unique by kind+id
    const seen = new Set<string>();
    const uniq: UpgradeOption[] = [];
    for (const o of opts) {
      const k = `${o.kind}:${o.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(o);
    }
    opts.splice(0, opts.length, ...uniq);
  }

  return opts.slice(0, TARGET_OPTIONS);
}
