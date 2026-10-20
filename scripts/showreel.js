/* =============================================================
   showreel.js — arma el showreel vertical de la portada
   -------------------------------------------------------------
   Uso:   npm run showreel        (después: ONLY=hero-showreel npm run optimize:video)

   Junta los tramos de SHOWREEL (content.js) de sus reels originales en un solo video vertical de 720×1280,
   24 cuadros por segundo, sin sonido, en _fuentes/video/showreel.mp4 (calidad alta: el optimizador lo
   comprime después como a cualquier bucle). No se publica: se publica lo que genera el optimizador.
   ============================================================= */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const { SHOWREEL = [], SOURCE, GROUPS } = require(path.join(ROOT, "content.js"));
const { resolveImage } = require("./lib");

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { return require("ffmpeg-static"); } catch { /* no instalado acá */ }
  const sibling = path.join(ROOT, "..", "Agustin Reyes", "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  if (fs.existsSync(sibling)) return sibling;
  throw new Error("No encuentro ffmpeg (npm i -D ffmpeg-static o FFMPEG=<ruta>)");
}
const FF = findFfmpeg();
if (!SHOWREEL.length) { console.error("\n✗ SHOWREEL está vacío en content.js\n"); process.exit(1); }

const OUT = path.join(ROOT, "_fuentes", "video");
fs.mkdirSync(OUT, { recursive: true });
const src = SHOWREEL.map((s) => resolveImage(path.join(ROOT, SOURCE), GROUPS, { g: "reels", f: s.f }));
const args = ["-hide_banner", "-loglevel", "error", "-y"];
SHOWREEL.forEach((s, i) => args.push("-ss", String(s.from), "-t", String(s.dur), "-i", src[i]));
// cada tramo: a 720×1280 (recortando al centro si hiciera falta), 24 fps, y después se encadenan
const parts = SHOWREEL.map((s, i) => `[${i}:v]scale=720:1280:force_original_aspect_ratio=increase:flags=lanczos,crop=720:1280,fps=24,setsar=1,format=yuv420p[v${i}]`);
const filter = parts.join(";") + ";" + SHOWREEL.map((_, i) => `[v${i}]`).join("") + `concat=n=${SHOWREEL.length}:v=1:a=0[out]`;
const out = path.join(OUT, "showreel.mp4");
args.push("-filter_complex", filter, "-map", "[out]", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-an", out);
execFileSync(FF, args, { stdio: ["ignore", "ignore", "inherit"] });
const dur = SHOWREEL.reduce((n, s) => n + s.dur, 0);
console.log(`\n✓ _fuentes/video/showreel.mp4 · ${SHOWREEL.length} tramos · ${dur.toFixed(1)} s · ${(fs.statSync(out).size / 1048576).toFixed(1)} MB\n`);
