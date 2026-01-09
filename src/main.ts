import { generateMaze, Maze } from "./maze.ts";
import { renderMazeToCanvas } from "./render";
import { canvasToPngBlob, downloadBlob, mazeToJsonBlob, mazeToSvgBlob } from "./export";

const elW = document.getElementById("w") as HTMLInputElement;
const elH = document.getElementById("h") as HTMLInputElement;
const elCell = document.getElementById("cell") as HTMLInputElement;
const elLoops = document.getElementById("loops") as HTMLInputElement;
const elStraight = document.getElementById("straight") as HTMLInputElement;
const elSeed = document.getElementById("seed") as HTMLInputElement;

const btnGen = document.getElementById("gen") as HTMLButtonElement;
const btnRand = document.getElementById("rand") as HTMLButtonElement;
const btnJson = document.getElementById("dl-json") as HTMLButtonElement;
const btnSvg = document.getElementById("dl-svg") as HTMLButtonElement;
const btnPng = document.getElementById("dl-png") as HTMLButtonElement;

const canvas = document.getElementById("cv") as HTMLCanvasElement;

let current: Maze | null = null;

loadFromUrl();
regenerate();

btnGen.addEventListener("click", () => regenerate());
btnRand.addEventListener("click", () => {
  elSeed.value = String(Math.floor(Math.random() * 1e9));
  regenerate();
});

[elW, elH, elCell, elLoops, elStraight, elSeed].forEach((i) => {
  i.addEventListener("change", () => regenerate());
});

btnJson.addEventListener("click", () => {
  if (!current) return;
  downloadBlob(mazeToJsonBlob(current), `maze_${current.w}x${current.h}_${current.seed}.json`);
});

btnSvg.addEventListener("click", () => {
  if (!current) return;
  downloadBlob(mazeToSvgBlob(current), `maze_${current.w}x${current.h}_${current.seed}.svg`);
});

btnPng.addEventListener("click", async () => {
  if (!current) return;
  const blob = await canvasToPngBlob(canvas);
  downloadBlob(blob, `maze_${current.w}x${current.h}_${current.seed}.png`);
});

function regenerate() {
  const w = clampInt(elW.value, 5, 200, 30);
  const h = clampInt(elH.value, 5, 200, 20);
  const cellPx = clampInt(elCell.value, 4, 40, 18);
  const loopsPercent = clampInt(elLoops.value, 0, 30, 6);
  const straightness = clampInt(elStraight.value, 0, 100, 30);
  const seed = (elSeed.value || "1").trim();

  // normalize back into inputs
  elW.value = String(w);
  elH.value = String(h);
  elCell.value = String(cellPx);
  elLoops.value = String(loopsPercent);
  elStraight.value = String(straightness);
  elSeed.value = seed;

  current = generateMaze({ w, h, cellPx, seed, loopsPercent, straightness });
  renderMazeToCanvas(current, canvas);
  saveToUrl({ w, h, cellPx, loopsPercent, straightness, seed });
}

function clampInt(v: string, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function saveToUrl(p: {
  w: number; h: number; cellPx: number; loopsPercent: number; straightness: number; seed: string;
}) {
  const url = new URL(window.location.href);
  url.searchParams.set("w", String(p.w));
  url.searchParams.set("h", String(p.h));
  url.searchParams.set("cell", String(p.cellPx));
  url.searchParams.set("loops", String(p.loopsPercent));
  url.searchParams.set("straight", String(p.straightness));
  url.searchParams.set("seed", p.seed);
  history.replaceState(null, "", url.toString());
}

function loadFromUrl() {
  const url = new URL(window.location.href);
  const w = url.searchParams.get("w");
  const h = url.searchParams.get("h");
  const cell = url.searchParams.get("cell");
  const loops = url.searchParams.get("loops");
  const straight = url.searchParams.get("straight");
  const seed = url.searchParams.get("seed");

  if (w) elW.value = w;
  if (h) elH.value = h;
  if (cell) elCell.value = cell;
  if (loops) elLoops.value = loops;
  if (straight) elStraight.value = straight;
  if (seed) elSeed.value = seed;
}
