import type { Registries } from './loadData';
import type { EnemyDef } from './enemy';

export type SpawnSystemConfig = {
  runDurationSec: number;
  maxEnemies: number;
  spawnsPerSecMul?: number;
};

type Segment = {
  fromSec: number;
  toSec: number;
  weights: Record<string, number>;
};

type SpawnTable = {
  threat: { baseSpawnsPerSec: number; spawnsPerSecAt20m: number };
  segments: Segment[];
  spawnRing: { minRadius: number; maxRadius: number };
  despawn: { beyondRadius: number };
};

export class SpawnSystem {
  private readonly data: Registries;
  private readonly cfg: SpawnSystemConfig;
  private readonly table: SpawnTable;

  private acc = 0;

  constructor(data: Registries, spawnTableId: string, cfg: SpawnSystemConfig) {
    this.data = data;
    this.cfg = cfg;
    const table = data.spawnTablesById.get(spawnTableId);
    if (!table) throw new Error(`Missing spawn table '${spawnTableId}'`);
    this.table = table as any;
  }

  update(dtSec: number, elapsedSec: number, getEnemyCount: () => number, spawnOne: (def: EnemyDef, x: number, y: number) => void, origin: { x: number; y: number }, isBlocked: (x: number, y: number, r: number) => boolean) {
    const spawnRate = this.spawnsPerSec(elapsedSec) * (this.cfg.spawnsPerSecMul ?? 1);
    this.acc += dtSec * spawnRate;

    const cap = this.cfg.maxEnemies;

    while (this.acc >= 1) {
      this.acc -= 1;
      if (getEnemyCount() >= cap) break;

      const enemyId = this.pickEnemyId(elapsedSec);
      const def = this.data.enemiesById.get(enemyId) as any as EnemyDef | undefined;
      if (!def) continue;

      const pos = this.pickSpawnPos(origin.x, origin.y, def.size, isBlocked);
      if (!pos) continue;

      spawnOne(def, pos.x, pos.y);
    }
  }

  shouldDespawn(enemyX: number, enemyY: number, origin: { x: number; y: number }) {
    const dx = enemyX - origin.x;
    const dy = enemyY - origin.y;
    const d = Math.hypot(dx, dy);
    return d > this.table.despawn.beyondRadius;
  }

  private spawnsPerSec(elapsedSec: number) {
    const t = Math.max(0, Math.min(this.cfg.runDurationSec, elapsedSec));
    const k = t / this.cfg.runDurationSec;
    const a = this.table.threat.baseSpawnsPerSec;
    const b = this.table.threat.spawnsPerSecAt20m;
    return a + (b - a) * k;
  }

  private pickEnemyId(elapsedSec: number) {
    const seg = this.segmentFor(elapsedSec);
    const entries = Object.entries(seg.weights);
    let sum = 0;
    for (const [, w] of entries) sum += w;
    let r = Math.random() * sum;
    for (const [id, w] of entries) {
      r -= w;
      if (r <= 0) return id;
    }
    return entries[0]?.[0] ?? 'snack_hunter';
  }

  private segmentFor(elapsedSec: number): Segment {
    const t = elapsedSec;
    for (const s of this.table.segments) {
      if (t >= s.fromSec && t < s.toSec) return s;
    }
    // fallback to last
    return this.table.segments[this.table.segments.length - 1];
  }

  private pickSpawnPos(ox: number, oy: number, r: number, isBlocked: (x: number, y: number, r: number) => boolean) {
    const minR = this.table.spawnRing.minRadius;
    const maxR = this.table.spawnRing.maxRadius;

    for (let tries = 0; tries < 8; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = minR + Math.random() * (maxR - minR);
      const x = ox + Math.cos(ang) * dist;
      const y = oy + Math.sin(ang) * dist;
      if (!isBlocked(x, y, r)) return { x, y };
    }
    return null;
  }
}
