import { Maze, idx } from "./maze.ts";

const N = 1, E = 2, S = 4, W = 8;

export function renderMazeToCanvas(maze: Maze, canvas: HTMLCanvasElement) {
  const { w, h, cellPx, walls, start, end } = maze;

  const pad = Math.max(10, Math.floor(cellPx * 0.75));
  const widthPx = w * cellPx + pad * 2;
  const heightPx = h * cellPx + pad * 2;

  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  canvas.width = widthPx * dpr;
  canvas.height = heightPx * dpr;
  canvas.style.width = `${widthPx}px`;
  canvas.style.height = `${heightPx}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, widthPx, heightPx);

  // background
  ctx.fillStyle = "#070b10";
  ctx.fillRect(0, 0, widthPx, heightPx);

  // maze lines
  ctx.strokeStyle = "#e7eefc";
  ctx.lineWidth = Math.max(1, Math.floor(cellPx * 0.12));
  ctx.lineCap = "square";

  const ox = pad, oy = pad;

  ctx.beginPath();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w);
      const cell = walls[i];

      const x0 = ox + x * cellPx;
      const y0 = oy + y * cellPx;
      const x1 = x0 + cellPx;
      const y1 = y0 + cellPx;

      if (cell & N) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
      if (cell & E) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
      if (cell & S) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
      if (cell & W) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
    }
  }
  ctx.stroke();

  // start/end markers
  drawMarker(ctx, ox, oy, cellPx, start.x, start.y, "#37d67a");
  drawMarker(ctx, ox, oy, cellPx, end.x, end.y, "#ff5c5c");
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  cellPx: number,
  x: number,
  y: number,
  color: string
) {
  const cx = ox + x * cellPx + cellPx * 0.5;
  const cy = oy + y * cellPx + cellPx * 0.5;
  const r = Math.max(3, cellPx * 0.22);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}
