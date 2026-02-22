# Data Loader Spec — MVP v1

## Goal
Load all JSON data at boot, validate basic integrity (IDs, references), and expose typed registries.

## Load Order
1. `weapons.json`
2. `passives.json`
3. `evolutions.json`
4. `enemies.json`
5. `spawn_tables.json`
6. `stages.json`
7. `drops.json`
8. `levelup_rules.json`
9. `combat_rules.json`
10. `progression.json`
11. `upgrades_meta.json`

## Registries
- `weaponsById: Map<string, WeaponDef>`
- `passivesById: Map<string, PassiveDef>`
- `enemiesById: Map<string, EnemyDef>`
- `stagesById: Map<string, StageDef>`
- `spawnTablesById: Map<string, SpawnTableDef>`
- `metaUpgradesById: Map<string, MetaUpgradeDef>`

## Validation (minimum)
### ID uniqueness
- No duplicate `id` within each file.

### Reference validation
- `WeaponDef.evolvesTo` must exist in `weaponsById` AND be rarity `evolved`.
- `EvolutionDef.fromWeapon` exists AND is not evolved.
- `EvolutionDef.toWeapon` exists AND is evolved.
- `EvolutionDef.requires.passiveId` exists.
- `StageDef.spawnTableId` exists.
- `StageDef.bossSchedule[].enemyId` exists when type is boss/boss_final.
- `SpawnSegment.weights` keys exist in enemies.
- `SpawnEliteConfig.enemyId` exists.

### Constraints
- Base weapons maxLevel = 8; evolved maxLevel = 1.
- Slot limits (weapons/passives) must be positive.
- Segment ranges are non-overlapping and cover 0..runDurationSec.

## Hot Reload (later)
Not required in MVP; but keep loader separated so JSON changes can be reloaded in dev.
