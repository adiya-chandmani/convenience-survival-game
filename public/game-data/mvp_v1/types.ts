// MVP v1 data types for Convenience Night Survival
// Keep these small and stable; game code can extend via composition.

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "evolved";

export type WeaponKind =
  | "projectile"
  | "orbit"
  | "beam"
  | "cone"
  | "zone"
  | "boomerang"
  | "spread"
  | "lob";

export type TargetingMode = "nearest" | "facing" | "random";

export interface Targeting {
  mode: TargetingMode;
  maxAngleDeg: number;
  maxDistance: number;
}

export type ScaleEntry = {
  level: number;
  damageMul?: number;
  cooldownMul?: number;
  projectilesAdd?: number;
  pelletsAdd?: number;
  bladesAdd?: number;
  radiusAdd?: number;
  rangeAdd?: number;
  widthAdd?: number;
  angleAdd?: number;
  durationMul?: number;
  beamDurationMul?: number;
  angularSpeedMul?: number;
  tickMsMul?: number;
  ticksAdd?: number;
  pierceAdd?: number;
  spreadMul?: number;
};

export interface WeaponBaseCommon {
  damage: number;
  cooldownMs: number;
  knockback?: number;
}

export interface WeaponProjectileBase extends WeaponBaseCommon {
  projectiles: number;
  speed: number;
  pierce: number;
  durationMs: number;
  range: number;
  critChance?: number;
  critMul?: number;
  burst?: { shots: number; intervalMs: number };
}

export interface WeaponOrbitBase extends WeaponBaseCommon {
  blades: number;
  radius: number;
  angularSpeedDeg: number;
  hitCooldownMs: number;
}

export interface WeaponBeamBase extends WeaponBaseCommon {
  beamDurationMs: number;
  width: number;
  range: number;
  pierce: number;
  bonus?: Record<string, number | boolean>;
}

export interface WeaponConeBase extends WeaponBaseCommon {
  angleDeg: number;
  range: number;
  tickMs: number;
  ticks: number;
}

export interface WeaponZoneBase extends WeaponBaseCommon {
  durationMs: number;
  radius: number;
  tickMs: number;
  slowMul?: number;
  slowDurationMs?: number;
}

export interface WeaponBoomerangBase extends WeaponBaseCommon {
  projectiles: number;
  speed: number;
  range: number;
  pierce: number;
  hitCooldownMs: number;
}

export interface WeaponSpreadBase extends WeaponBaseCommon {
  pellets: number;
  spreadDeg: number;
  speed: number;
  range: number;
  pierce: number;
}

export interface WeaponLobBase extends WeaponBaseCommon {
  projectiles: number;
  throwRange: number;
  radius: number;
  durationMs: number;
  tickMs: number;
}

export type WeaponBase =
  | WeaponProjectileBase
  | WeaponOrbitBase
  | WeaponBeamBase
  | WeaponConeBase
  | WeaponZoneBase
  | WeaponBoomerangBase
  | WeaponSpreadBase
  | WeaponLobBase;

export interface WeaponDef {
  id: string;
  name: string;
  rarity: Rarity;
  kind: WeaponKind;
  maxLevel: number;
  tags?: string[];
  base: WeaponBase;
  scales?: ScaleEntry[];
  targeting?: Targeting;
  evolvesTo?: string;
}

export interface PassiveStatEntry {
  level: number;
  damageMul?: number;
  moveSpeedMul?: number;
  attackSpeedMul?: number;
  cooldownMul?: number;
  magnetMul?: number;
  armorAdd?: number;
  luckAdd?: number;
  coinGainMul?: number;
  xpGainMul?: number;
  maxHpAdd?: number;
}

export interface PassiveDef {
  id: string;
  name: string;
  rarity: Exclude<Rarity, "evolved">;
  maxLevel: number;
  stats: PassiveStatEntry[];
  tags?: string[];
}

export interface EvolutionDef {
  id: string;
  fromWeapon: string;
  requires: { weaponLevel: number; passiveId: string };
  trigger: "chest";
  toWeapon: string;
}

export type EnemyKind =
  | "chaser"
  | "chaser_fast"
  | "chaser_tank"
  | "chaser_swarm"
  | "ranged"
  | "exploder"
  | "elite"
  | "boss";

export interface EnemyRangedConfig {
  cooldownMs: number;
  projectileSpeed: number;
  damage: number;
  range: number;
}

export interface EnemyExplodeConfig {
  radius: number;
  damage: number;
  windupMs: number;
}

export interface EnemyBossConfig {
  phases: Array<{ hpPct: number; skills: string[] }>;
  drops: { chestCount: number };
}

export interface EnemyDropsConfig {
  chestChance?: number;
  magnetChance?: number;
  healChance?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  kind: EnemyKind;
  size: number;
  hp: number;
  speed: number;
  contactDamage: number;
  xpValue: number;
  coinDropChance: number;
  ranged?: EnemyRangedConfig;
  explode?: EnemyExplodeConfig;
  drops?: EnemyDropsConfig;
  boss?: EnemyBossConfig;
}

export interface StageBossEvent {
  timeSec: number;
  type: "elite_wave" | "boss" | "boss_final";
  reward?: "chest";
  enemyId?: string;
  clearOnKill?: boolean;
}

export interface InfiniteMapConfig {
  tileSize: number;
  chunkTiles: number;
  biome: string;
  decorDensity: number;
  solidObstacleChance: number;
}

export interface StageDef {
  id: string;
  name: string;
  theme: string;
  runDurationSec: number;
  bossSchedule: StageBossEvent[];
  infiniteMap: InfiniteMapConfig;
  spawnTableId: string;
}

export interface SpawnThreatCurve {
  baseSpawnsPerSec: number;
  spawnsPerSecAt20m: number;
  eliteChanceAt20m: number;
}

export interface SpawnSegment {
  fromSec: number;
  toSec: number;
  weights: Record<string, number>; // enemyId -> weight
}

export interface SpawnEliteConfig {
  enemyId: string;
  minSec: number;
  cooldownSec: number;
}

export interface SpawnRing {
  minRadius: number;
  maxRadius: number;
}

export interface DespawnConfig {
  beyondRadius: number;
}

export interface SpawnTableDef {
  id: string;
  notes?: string;
  threat: SpawnThreatCurve;
  segments: SpawnSegment[];
  elite?: SpawnEliteConfig;
  spawnRing: SpawnRing;
  despawn: DespawnConfig;
}

export interface MetaUpgradeDef {
  id: string;
  name: string;
  maxLevel: number;
  costs: number[];
  effect: Record<string, number | boolean>;
}

export interface DropsDef {
  xpGems: any;
  coins: any;
  consumables: any;
  chests: any;
  economy: any;
}

export interface LevelupRulesDef {
  selection: any;
  slots: any;
  candidatePool: any;
  rules: any;
}

export interface ProgressionDef {
  target: any;
  xpCurve: any;
  coinCurve: any;
}
