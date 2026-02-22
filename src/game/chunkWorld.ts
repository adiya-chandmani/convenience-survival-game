import Phaser from 'phaser';

export type ChunkWorldConfig = {
  tileSize: number;
  chunkTiles: number;
  decorDensity: number;
  solidObstacleChance: number;
};

type ChunkCoord = { cx: number; cy: number };

type ObstacleType = 'shelf' | 'fridge' | 'counter' | 'crate';

type Obstacle = {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  w: number;
  h: number;
};

function chunkKey(cx: number, cy: number) {
  return `${cx},${cy}`;
}

// Simple deterministic RNG from integer seed (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2i(a: number, b: number) {
  // quick 2D hash -> 32-bit int
  let x = a | 0;
  let y = b | 0;
  let h = 2166136261;
  h = Math.imul(h ^ x, 16777619);
  h = Math.imul(h ^ y, 16777619);
  return h >>> 0;
}

function aabbIntersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class ChunkWorld {
  private readonly scene: Phaser.Scene;
  private readonly cfg: ChunkWorldConfig;
  private readonly chunkSizePx: number;

  private obstaclesByChunk = new Map<string, Obstacle[]>();
  private graphicsByChunk = new Map<string, Phaser.GameObjects.Graphics>();

  // current active solids for collision
  private activeSolids: Obstacle[] = [];

  constructor(scene: Phaser.Scene, cfg: ChunkWorldConfig) {
    this.scene = scene;
    this.cfg = cfg;
    this.chunkSizePx = cfg.chunkTiles * cfg.tileSize;
  }

  getSolids(): ReadonlyArray<Obstacle> {
    return this.activeSolids;
  }

  update(camera: Phaser.Cameras.Scene2D.Camera) {
    const view = camera.worldView;

    // Load chunks around view (+margin)
    const margin = this.chunkSizePx * 0.75;
    const minX = view.x - margin;
    const minY = view.y - margin;
    const maxX = view.right + margin;
    const maxY = view.bottom + margin;

    const minC = this.worldToChunk(minX, minY);
    const maxC = this.worldToChunk(maxX, maxY);

    const neededKeys = new Set<string>();
    const solids: Obstacle[] = [];

    for (let cy = minC.cy; cy <= maxC.cy; cy++) {
      for (let cx = minC.cx; cx <= maxC.cx; cx++) {
        const key = chunkKey(cx, cy);
        neededKeys.add(key);
        if (!this.obstaclesByChunk.has(key)) {
          const obs = this.generateChunk(cx, cy);
          this.obstaclesByChunk.set(key, obs);
        }
        solids.push(...(this.obstaclesByChunk.get(key) ?? []));
        if (!this.graphicsByChunk.has(key)) {
          this.graphicsByChunk.set(key, this.drawChunk(cx, cy, this.obstaclesByChunk.get(key) ?? []));
        }
      }
    }

    // Cull far graphics (keep small cache)
    for (const [key, g] of this.graphicsByChunk.entries()) {
      if (!neededKeys.has(key)) {
        g.destroy();
        this.graphicsByChunk.delete(key);
      }
    }

    this.activeSolids = solids;
  }

  private worldToChunk(x: number, y: number): ChunkCoord {
    const cx = Math.floor(x / this.chunkSizePx);
    const cy = Math.floor(y / this.chunkSizePx);
    return { cx, cy };
  }

  private chunkOrigin(cx: number, cy: number) {
    return { x: cx * this.chunkSizePx, y: cy * this.chunkSizePx };
  }

  private generateChunk(cx: number, cy: number): Obstacle[] {
    const seed = hash2i(cx, cy);
    const rand = mulberry32(seed);

    const out: Obstacle[] = [];
    const { x: ox, y: oy } = this.chunkOrigin(cx, cy);
    const ts = this.cfg.tileSize;

    // Global corridor policy: keep a cross-shaped passage through every chunk.
    const corridorW = ts * 3;
    const cxMid = ox + this.chunkSizePx / 2;
    const cyMid = oy + this.chunkSizePx / 2;

    const corridorV = { x: cxMid - corridorW / 2, y: oy, w: corridorW, h: this.chunkSizePx };
    const corridorH = { x: ox, y: cyMid - corridorW / 2, w: this.chunkSizePx, h: corridorW };

    const canPlace = (box: { x: number; y: number; w: number; h: number }) => {
      if (aabbIntersects(box, corridorV) || aabbIntersects(box, corridorH)) return false;
      // keep a little border clear
      const border = ts * 0.5;
      if (box.x < ox + border || box.y < oy + border) return false;
      if (box.x + box.w > ox + this.chunkSizePx - border) return false;
      if (box.y + box.h > oy + this.chunkSizePx - border) return false;
      return true;
    };

    // Layout lanes (left/right of vertical corridor)
    const leftLaneX = ox + ts;
    const rightLaneX = cxMid + corridorW / 2 + ts;
    const laneWLeft = corridorV.x - leftLaneX - ts;
    const laneWRight = ox + this.chunkSizePx - ts - rightLaneX;

    // 1) Shelves (dominant obstacle) — long horizontal rectangles
    const shelfCount = (rand() < this.cfg.solidObstacleChance ? 1 : 0) + (rand() < this.cfg.solidObstacleChance * 0.85 ? 1 : 0);
    for (let i = 0; i < shelfCount; i++) {
      const lane = rand() < 0.5 ? 'L' : 'R';
      const laneX = lane === 'L' ? leftLaneX : rightLaneX;
      const laneW = lane === 'L' ? laneWLeft : laneWRight;
      if (laneW < ts * 4) continue;

      const w = ts * (4 + Math.floor(rand() * Math.min(5, Math.floor(laneW / ts) - 3)));
      const h = ts * 2;
      const x = laneX + Math.floor(rand() * Math.max(1, laneW - w));
      const y = oy + ts * (2 + Math.floor(rand() * (this.cfg.chunkTiles - 5)));

      const box = { x, y, w, h };
      if (!canPlace(box)) continue;

      out.push({ id: `shelf-${cx}-${cy}-${i}`, type: 'shelf', ...box });
    }

    // 2) Fridges — placed along top or bottom edge, but not blocking corridors.
    if (rand() < this.cfg.solidObstacleChance * 0.65) {
      const placeTop = rand() < 0.5;
      const h = ts * 2;
      const w = ts * (3 + Math.floor(rand() * 4));
      const y = placeTop ? oy + ts : oy + this.chunkSizePx - ts - h;

      // choose lane
      const lane = rand() < 0.5 ? 'L' : 'R';
      const laneX = lane === 'L' ? leftLaneX : rightLaneX;
      const laneW = lane === 'L' ? laneWLeft : laneWRight;
      if (laneW >= ts * 4) {
        const x = laneX + Math.floor(rand() * Math.max(1, laneW - w));
        const box = { x, y, w, h };
        if (canPlace(box)) out.push({ id: `fridge-${cx}-${cy}`, type: 'fridge', ...box });
      }
    }

    // 3) Counter — small block (like POS/counter island)
    if (rand() < this.cfg.solidObstacleChance * 0.35) {
      const w = ts * 3;
      const h = ts * 3;
      const laneX = rand() < 0.5 ? leftLaneX : rightLaneX;
      const laneW = rand() < 0.5 ? laneWLeft : laneWRight;
      if (laneW >= w + ts) {
        const x = laneX + Math.floor(rand() * Math.max(1, laneW - w));
        const y = oy + ts * (3 + Math.floor(rand() * (this.cfg.chunkTiles - 6)));
        const box = { x, y, w, h };
        if (canPlace(box)) out.push({ id: `counter-${cx}-${cy}`, type: 'counter', ...box });
      }
    }

    // 4) Crates — small solids, controlled by decorDensity (but reduced to avoid clutter)
    if (rand() < this.cfg.decorDensity * 0.12) {
      const w = ts;
      const h = ts;
      const x = ox + ts * (1 + Math.floor(rand() * (this.cfg.chunkTiles - 2)));
      const y = oy + ts * (1 + Math.floor(rand() * (this.cfg.chunkTiles - 2)));
      const box = { x, y, w, h };
      if (canPlace(box)) out.push({ id: `crate-${cx}-${cy}`, type: 'crate', ...box });
    }

    // Safety: never allow the chunk to become too dense.
    // If too many solids, drop the smallest ones first.
    if (out.length > 6) {
      out.sort((a, b) => a.w * a.h - b.w * b.h);
      while (out.length > 6) out.shift();
    }

    return out;
  }

  private drawChunk(cx: number, cy: number, solids: Obstacle[]) {
    const g = this.scene.add.graphics();
    g.setDepth(1);

    const { x: ox, y: oy } = this.chunkOrigin(cx, cy);

    // Chunk floor tint variation
    const seed = hash2i(cx, cy);
    const rand = mulberry32(seed ^ 0x9e3779b9);
    const base = 0x101720;
    const mod = Math.floor(rand() * 10);
    const floor = base + (mod << 16) + (mod << 8) + mod;

    g.fillStyle(floor, 1);
    g.fillRect(ox, oy, this.chunkSizePx, this.chunkSizePx);

    // Neon pools (cheap ambience): colored soft circles, deterministic per chunk
    const neonCount = rand() < 0.35 ? 1 : rand() < 0.12 ? 2 : 0;
    for (let i = 0; i < neonCount; i++) {
      const nx = ox + this.cfg.tileSize * (2 + Math.floor(rand() * (this.cfg.chunkTiles - 4)));
      const ny = oy + this.cfg.tileSize * (2 + Math.floor(rand() * (this.cfg.chunkTiles - 4)));
      const r = this.cfg.tileSize * (3 + Math.floor(rand() * 4));
      const palette = [0x2ee6a6, 0x4cc8ff, 0xff4fd8, 0xffc857];
      const col = palette[Math.floor(rand() * palette.length)];

      // draw layered circles to fake blur
      for (let k = 0; k < 4; k++) {
        const alpha = 0.055 - k * 0.01;
        g.fillStyle(col, Math.max(0.02, alpha));
        g.fillCircle(nx, ny, r - k * (this.cfg.tileSize * 0.6));
      }
    }

    // Tile-ish guide lines
    g.lineStyle(1, 0x1c2a3a, 0.9);
    for (let i = 0; i <= this.cfg.chunkTiles; i += 4) {
      g.beginPath();
      g.moveTo(ox, oy + i * this.cfg.tileSize);
      g.lineTo(ox + this.chunkSizePx, oy + i * this.cfg.tileSize);
      g.strokePath();

      g.beginPath();
      g.moveTo(ox + i * this.cfg.tileSize, oy);
      g.lineTo(ox + i * this.cfg.tileSize, oy + this.chunkSizePx);
      g.strokePath();
    }

    const colors: Record<ObstacleType, { fill: number; stroke: number; hi: number }> = {
      shelf: { fill: 0x243246, stroke: 0x0b0e12, hi: 0x2f4a6a },
      fridge: { fill: 0x1f3a40, stroke: 0x0b0e12, hi: 0x3a8a94 },
      counter: { fill: 0x3a2a2a, stroke: 0x0b0e12, hi: 0x8a5a5a },
      crate: { fill: 0x3a3a22, stroke: 0x0b0e12, hi: 0x9aa054 },
    };

    for (const s of solids) {
      const c = colors[s.type];
      g.fillStyle(c.fill, 1);
      g.fillRoundedRect(s.x, s.y, s.w, s.h, 4);
      g.lineStyle(2, c.stroke, 0.8);
      g.strokeRoundedRect(s.x, s.y, s.w, s.h, 4);

      // top highlight
      g.lineStyle(2, c.hi, 0.45);
      g.beginPath();
      g.moveTo(s.x + 4, s.y + 4);
      g.lineTo(s.x + s.w - 4, s.y + 4);
      g.strokePath();

      // Type-specific little details (cheap but readable)
      if (s.type === 'fridge') {
        // glass sheen + handle dots
        g.lineStyle(2, 0xbfefff, 0.18);
        g.beginPath();
        g.moveTo(s.x + 6, s.y + 6);
        g.lineTo(s.x + s.w - 10, s.y + s.h - 6);
        g.strokePath();

        g.fillStyle(0xe8eef7, 0.25);
        for (let i = 0; i < Math.max(1, Math.floor(s.h / 16)); i++) {
          g.fillCircle(s.x + s.w - 8, s.y + 10 + i * 16, 2);
        }
      } else if (s.type === 'shelf') {
        // product dots
        const cols = Math.max(2, Math.floor(s.w / 18));
        const rows = 2;
        for (let ry = 0; ry < rows; ry++) {
          for (let cx = 0; cx < cols; cx++) {
            const px = s.x + 10 + cx * (s.w - 20) / Math.max(1, cols - 1);
            const py = s.y + 10 + ry * (s.h - 20);
            const color = (cx + ry) % 3 === 0 ? 0xffc857 : (cx + ry) % 3 === 1 ? 0x7cff7c : 0x4cc8ff;
            g.fillStyle(color, 0.35);
            g.fillCircle(px, py, 2);
          }
        }
      } else if (s.type === 'counter') {
        // small POS screen
        g.fillStyle(0x0b0e12, 0.55);
        g.fillRoundedRect(s.x + s.w * 0.6, s.y + 6, s.w * 0.32, s.h * 0.28, 3);
        g.fillStyle(0x9ad1ff, 0.25);
        g.fillRect(s.x + s.w * 0.62, s.y + 9, s.w * 0.28, 2);
      } else if (s.type === 'crate') {
        // tape cross
        g.lineStyle(2, 0xe8d7a8, 0.25);
        g.beginPath();
        g.moveTo(s.x + 3, s.y + 3);
        g.lineTo(s.x + s.w - 3, s.y + s.h - 3);
        g.strokePath();
        g.beginPath();
        g.moveTo(s.x + s.w - 3, s.y + 3);
        g.lineTo(s.x + 3, s.y + s.h - 3);
        g.strokePath();
      }
    }

    return g;
  }
}
