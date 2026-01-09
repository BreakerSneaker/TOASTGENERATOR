import { Maze, idx } from "./maze";

const N = 1, E = 2, S = 4, W = 8;

export function mazeToJsonBlob(maze: Maze): Blob {
  // store walls as array of numbers (bitmask per cell)
  const data = {
    format: maze.format,
    seed: maze.seed,
    w: maze.w,
    h: maze.h,
    cellPx: maze.cellPx,
    start: maze.start,
    end: maze.end,
    walls: Array.from(maze.walls)
  };
  return new Blob([JSON.stringify(data)], { type: "application/json" });
}

export function mazeToSvgBlob(maze: Maze): Blob {
  const { w, h, cellPx, walls } = maze;
  const pad = Math.max(10, Math.floor(cellPx * 0.75));
  const width = w * cellPx + pad * 2;
  const height = h * cellPx + pad * 2;

  const ox = pad, oy = pad;
  const lines: string[] = [];
  const strokeW = Math.max(1, Math.floor(cellPx * 0.12));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w);
      const cell = walls[i];

      const x0 = ox + x * cellPx;
      const y0 = oy + y * cellPx;
      const x1 = x0 + cellPx;
      const y1 = y0 + cellPx;

      if (cell & N) lines.push(`M ${x0} ${y0} L ${x1} ${y0}`);
      if (cell & E) lines.push(`M ${x1} ${y0} L ${x1} ${y1}`);
      if (cell & S) lines.push(`M ${x0} ${y1} L ${x1} ${y1}`);
      if (cell & W) lines.push(`M ${x0} ${y0} L ${x0} ${y1}`);
    }
  }

  const d = lines.join(" ");
  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#070b10"/>
  <path d="${d}" fill="none" stroke="#e7eefc" stroke-width="${strokeW}" stroke-linecap="square"/>
</svg>`;

  return new Blob([svg], { type: "image/svg+xml" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error("PNG export failed"));
      else resolve(b);
    }, "image/png");
  });
}
