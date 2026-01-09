export type Maze = {
  format: "maze-v1";
  seed: string;
  w: number;
  h: number;
  cellPx: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  // bitmask per cell: N=1, E=2, S=4, W=8 (bit set = wall present)
  walls: Uint8Array;
};

const N = 1, E = 2, S = 4, W = 8;

export function wallBit(dir: "N" | "E" | "S" | "W"): number {
  return dir === "N" ? N : dir === "E" ? E : dir === "S" ? S : W;
}

export function idx(x: number, y: number, w: number): number {
  return y * w + x;
}

export function hashSeedToU32(seed: string): number {
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function makeRng(seedStr: string) {
  // xorshift32
  let s = hashSeedToU32(seedStr) || 1;
  return {
    nextU32() {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17; s >>>= 0;
      s ^= s << 5;  s >>>= 0;
      return s >>> 0;
    },
    float01() {
      return (this.nextU32() >>> 0) / 4294967296;
    },
    int(min: number, maxExclusive: number) {
      const r = this.nextU32() % (maxExclusive - min);
      return min + r;
    }
  };
}

type Dir = "N" | "E" | "S" | "W";
const DIRS: Dir[] = ["N", "E", "S", "W"];

function neighbor(x: number, y: number, dir: Dir) {
  if (dir === "N") return { x, y: y - 1 };
  if (dir === "E") return { x: x + 1, y };
  if (dir === "S") return { x, y: y + 1 };
  return { x: x - 1, y };
}

function opposite(dir: Dir): Dir {
  if (dir === "N") return "S";
  if (dir === "E") return "W";
  if (dir === "S") return "N";
  return "E";
}

function inBounds(x: number, y: number, w: number, h: number) {
  return x >= 0 && y >= 0 && x < w && y < h;
}

function removeWall(walls: Uint8Array, w: number, x: number, y: number, dir: Dir) {
  const i = idx(x, y, w);
  walls[i] = (walls[i] & ~wallBit(dir)) as number;
}

export function generateMaze(opts: {
  w: number;
  h: number;
  cellPx: number;
  seed: string;
  loopsPercent: number;      // 0..30 recommended
  straightness: number;      // 0..100
}): Maze {
  const { w, h, cellPx, seed } = opts;
  const loopsPercent = clamp(opts.loopsPercent, 0, 30);
  const straightness = clamp(opts.straightness, 0, 100);

  const rng = makeRng(seed);

  // Start with all walls
  const walls = new Uint8Array(w * h);
  walls.fill(N | E | S | W);

  // DFS backtracker (iterative)
  const visited = new Uint8Array(w * h);
  const stack: { x: number; y: number; prevDir: Dir | null }[] = [];

  const startX = rng.int(0, w);
  const startY = rng.int(0, h);
  stack.push({ x: startX, y: startY, prevDir: null });
  visited[idx(startX, startY, w)] = 1;

  while (stack.length > 0) {
    const top = stack[stack.length - 1];

    // collect unvisited neighbors
    const candidates: Dir[] = [];
    for (const d of DIRS) {
      const nb = neighbor(top.x, top.y, d);
      if (!inBounds(nb.x, nb.y, w, h)) continue;
      const ni = idx(nb.x, nb.y, w);
      if (visited[ni] === 0) candidates.push(d);
    }

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    // bias toward continuing straight (corridors)
    let chosen: Dir;
    if (top.prevDir && rng.int(0, 100) < straightness && candidates.includes(top.prevDir)) {
      chosen = top.prevDir;
    } else {
      chosen = candidates[rng.int(0, candidates.length)];
    }

    const nb = neighbor(top.x, top.y, chosen);
    // carve passage both ways
    removeWall(walls, w, top.x, top.y, chosen);
    removeWall(walls, w, nb.x, nb.y, opposite(chosen));

    visited[idx(nb.x, nb.y, w)] = 1;
    stack.push({ x: nb.x, y: nb.y, prevDir: chosen });
  }

  // Add loops by removing some random interior walls
  const targetRemovals = Math.floor((w * h) * (loopsPercent / 100) * 0.5);
  let removals = 0;
  let safety = targetRemovals * 20 + 200;

  while (removals < targetRemovals && safety-- > 0) {
    const x = rng.int(0, w);
    const y = rng.int(0, h);
    const d: Dir = DIRS[rng.int(0, 4)];

    const nb = neighbor(x, y, d);
    if (!inBounds(nb.x, nb.y, w, h)) continue;

    // avoid breaking outer border too much (keep nicer frame)
    if (x === 0 && d === "W") continue;
    if (y === 0 && d === "N") continue;
    if (x === w - 1 && d === "E") continue;
    if (y === h - 1 && d === "S") continue;

    const i = idx(x, y, w);
    if ((walls[i] & wallBit(d)) === 0) continue; // already open

    removeWall(walls, w, x, y, d);
    removeWall(walls, w, nb.x, nb.y, opposite(d));
    removals++;
  }

  // Choose end as farthest cell from start (BFS distance)
  const start = { x: startX, y: startY };
  const end = farthestCellByBfs(w, h, walls, start);

  return {
    format: "maze-v1",
    seed,
    w,
    h,
    cellPx,
    start,
    end,
    walls
  };
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function canMove(walls: Uint8Array, w: number, x: number, y: number, dir: Dir) {
  const i = idx(x, y, w);
  return (walls[i] & wallBit(dir)) === 0;
}

function farthestCellByBfs(w: number, h: number, walls: Uint8Array, start: {x:number;y:number}) {
  const qx = new Int16Array(w * h);
  const qy = new Int16Array(w * h);
  const dist = new Int32Array(w * h);
  dist.fill(-1);

  let qh = 0, qt = 0;
  const si = idx(start.x, start.y, w);
  dist[si] = 0;
  qx[qt] = start.x; qy[qt] = start.y; qt++;

  let best = { x: start.x, y: start.y, d: 0 };

  while (qh < qt) {
    const x = qx[qh], y = qy[qh]; qh++;
    const i = idx(x, y, w);
    const d0 = dist[i];

    if (d0 > best.d) best = { x, y, d: d0 };

    // neighbors where passage is open
    if (y > 0 && canMove(walls, w, x, y, "N")) push(x, y - 1, d0 + 1);
    if (x < w - 1 && canMove(walls, w, x, y, "E")) push(x + 1, y, d0 + 1);
    if (y < h - 1 && canMove(walls, w, x, y, "S")) push(x, y + 1, d0 + 1);
    if (x > 0 && canMove(walls, w, x, y, "W")) push(x - 1, y, d0 + 1);
  }

  return { x: best.x, y: best.y };

  function push(nx: number, ny: number, nd: number) {
    const ni = idx(nx, ny, w);
    if (dist[ni] !== -1) return;
    dist[ni] = nd;
    qx[qt] = nx; qy[qt] = ny; qt++;
  }
}
