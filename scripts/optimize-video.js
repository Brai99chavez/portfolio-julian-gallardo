/* =============================================================
   optimize-video.js — genera los videos del sitio desde contenido/
   -------------------------------------------------------------
   Uso:   npm run optimize:video
          ONLY=hero-rodaje npm run optimize:video        (solo esos)

   Por cada video declarado en VIDEOS (content.js):
     - recorta el tramo (from + dur) del original;
     - si viene en HDR de celular (HLG o PQ, 10 bits) lo convierte a color normal (SDR, BT.709) con
       tone-mapping: sin eso, en la web se ve lavado;
     - H.264 + yuv420p + faststart (arranca a reproducirse antes de bajar todo; lo lee cualquier navegador);
     - loop:true  = bucle mudo de pocos segundos (sin pista de audio);
       film:true  = pieza completa con sonido (AAC), que se ve con un clic;
     - crop (opcional) para sacar algo quemado en la imagen (la fecha de una cámara de acción);
     - un póster (el primer cuadro, en WebP) para que se vea algo antes de reproducir y sin JS;
     - nombre con hash del contenido: <id>-<hash>.mp4 (se puede cachear un año).
   Escribe assets/video/manifest.json, que usa el build. Si el original y los parámetros no cambiaron,
   no lo vuelve a codificar. Los originales de contenido/ no se tocan.

   ffmpeg: FFMPEG=<ruta> · si no, el paquete ffmpeg-static de este proyecto · si no, el del portfolio de Agustín.
   ============================================================= */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const sharp = require("sharp");
const { resolveImage } = require("./lib");

const ROOT = path.resolve(__dirname, "..");
const { GROUPS, VIDEOS = {}, SOURCE = "contenido" } = require(path.join(ROOT, "content.js"));
const SRC = path.join(ROOT, SOURCE);   // la carpeta de originales del cliente (no se mueve ni se publica)
const OUT = path.join(ROOT, "assets", "video");
const manifestPath = path.join(OUT, "manifest.json");
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { return require("ffmpeg-static"); } catch { /* no instalado acá */ }
  const sibling = path.join(ROOT, "..", "Agustin Reyes", "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  if (fs.existsSync(sibling)) return sibling;
  throw new Error("No encuentro ffmpeg. Instalalo con: npm i -D ffmpeg-static   (o definí FFMPEG=<ruta a ffmpeg>)");
}
const FF = findFfmpeg();

/* medidas: el lado corto a 720 (vertical 720×1280, horizontal 1280×720), nunca se agranda (no hace falta 4K ni Full HD).
   CRF elegido MIDIENDO el clip de portada (6 s, 720 px): CRF 23 = 1,43 MB · 26 = 0,98 MB · 28 = 0,78 MB · 30 = 0,62 MB;
   al 100 % el 26 se ve igual que el 23 y en el 30 aparecen bloques en los detalles. Bucles: 26 (~1 MB cada 6 s).
   La pieza completa (con sonido, se baja solo al darle play), medida sobre la microficción (62 s, mucho grano):
   CRF 25 = 22,7 MB · 28 = 9,8 MB · 30 = 6,6 MB · 540 px CRF 27 = 6,3 MB; a tamaño normal el 28 no se distingue del 25
   y desde el 30 se empieza a perder el grano (es parte del look). → 28. */
const SHORT = 720;
const CRF_LOOP = 26, CRF_FILM = 28;
// HDR de celular → SDR BT.709 (hable, sin desaturar; se probó contra los fotogramas y el color queda natural)
const TONEMAP = "zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p";
const TONEMAP_PQ = TONEMAP.replace("tin=arib-std-b67", "tin=smpte2084");

const probe = (file) => {
  let info = "";
  try { execFileSync(FF, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] }); }
  catch (e) { info = String(e.stderr || ""); }
  const v = info.match(/Video: .*?, (\d{2,5})x(\d{2,5})/);
  const d = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
  // los celulares graban «acostado» y guardan la rotación aparte: el tamaño que se VE es el girado. Sin esto, los
  // verticales en 4K salían de 406×720 (se tomaban por horizontales y se achicaban por el alto).
  const rot = info.match(/rotation of (-?[\d.]+)/) || info.match(/rotate\s*:\s*(-?\d+)/);
  const turned = rot && Math.abs(Math.round(+rot[1])) % 180 === 90;
  const [w, h] = v ? (turned ? [+v[2], +v[1]] : [+v[1], +v[2]]) : [0, 0];
  return { w, h, dur: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0,
           hdr: /arib-std-b67/.test(info) ? "HLG" : /smpte2084/.test(info) ? "PQ" : "", audio: /Audio:/.test(info) };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const ids = Object.keys(VIDEOS).filter((id) => !ONLY || ONLY.has(id));
  if (ONLY) for (const id of ONLY) if (!VIDEOS[id]) throw new Error(`ONLY: no existe el video "${id}"`);
  for (const id of Object.keys(manifest)) if (!VIDEOS[id]) delete manifest[id];   // se sacó de content.js

  for (const id of ids) {
    const v = VIDEOS[id];
    if (!!v.loop === !!v.film) throw new Error(`El video "${id}" tiene que ser loop:true o film:true (uno de los dos)`);
    const src = resolveImage(SRC, GROUPS, v);
    const st = fs.statSync(src);
    const params = { from: v.from || 0, dur: v.dur || 0, loop: !!v.loop, short: SHORT, crf: v.crf ?? (v.loop ? CRF_LOOP : CRF_FILM), posterAt: v.posterAt ?? 0.05, crop: v.crop || "", v: 4 };
    const sig = crypto.createHash("md5").update(JSON.stringify({ size: st.size, mtime: Math.round(st.mtimeMs), ...params })).digest("hex");
    const prev = manifest[id];
    if (prev && prev.sig === sig && fs.existsSync(path.join(OUT, prev.file)) && fs.existsSync(path.join(OUT, prev.poster))) {
      console.log(`  = ${id.padEnd(18)} sin cambios (${(prev.bytes / 1048576).toFixed(2)} MB)`); continue;
    }
    const pr = probe(src);
    if (!pr.w) throw new Error(`No pude leer el video "${id}" (${v.f})`);
    if (v.from && v.from >= pr.dur) throw new Error(`"${id}": from=${v.from}s pero el video dura ${pr.dur.toFixed(1)}s`);
    const vertical = pr.h > pr.w;
    const scale = vertical ? `scale='min(${SHORT},iw)':-2:flags=lanczos` : `scale=-2:'min(${SHORT},ih)':flags=lanczos`;
    // crop (opcional, sintaxis de ffmpeg «ancho:alto:x:y»): para sacar algo quemado en la imagen, como la fecha de una cámara de acción
    const vf = [pr.hdr === "HLG" ? TONEMAP : pr.hdr === "PQ" ? TONEMAP_PQ : "", v.crop ? `crop=${v.crop}` : "", scale, "format=yuv420p"].filter(Boolean).join(",");
    const tmp = path.join(OUT, `_${id}.mp4`);
    const args = ["-hide_banner", "-loglevel", "error", "-y",
      ...(v.from ? ["-ss", String(v.from)] : []), "-i", src, ...(v.dur ? ["-t", String(v.dur)] : []),
      "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", String(params.crf), "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-g", "60", "-movflags", "+faststart", "-tag:v", "avc1",
      ...(v.loop || !pr.audio ? ["-an"] : ["-c:a", "aac", "-b:a", "128k", "-ac", "2"]), tmp];
    const t0 = Date.now();
    execFileSync(FF, args, { stdio: ["ignore", "ignore", "inherit"] });
    const buf = fs.readFileSync(tmp);
    const hash = crypto.createHash("md5").update(buf).digest("hex").slice(0, 8);
    const file = `${id}-${hash}.mp4`;
    // póster: el primer cuadro del video ya convertido (mismo color que lo que se va a ver). posterAt = otro segundo
    // (la microficción arranca en negro: con el primer cuadro el póster salía negro)
    const pngTmp = path.join(OUT, `_${id}.png`);
    execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(v.posterAt ?? 0.05), "-i", tmp, "-frames:v", "1", pngTmp]);
    const posterBuf = await sharp(fs.readFileSync(pngTmp)).webp({ quality: 86 }).toBuffer();
    const pmeta = await sharp(posterBuf).metadata();
    const poster = `${id}-${crypto.createHash("md5").update(posterBuf).digest("hex").slice(0, 8)}.webp`;
    // limpiar versiones viejas de este id y escribir las nuevas
    for (const f of fs.readdirSync(OUT)) if (new RegExp("^" + id + "-[0-9a-f]{8}[.](mp4|webp)$").test(f)) fs.rmSync(path.join(OUT, f));
    fs.renameSync(tmp, path.join(OUT, file));
    fs.writeFileSync(path.join(OUT, poster), posterBuf);
    fs.rmSync(pngTmp);
    const out = probe(path.join(OUT, file));
    manifest[id] = { file, poster, w: pmeta.width, h: pmeta.height, dur: +out.dur.toFixed(2), bytes: buf.length, audio: out.audio, hdrSrc: pr.hdr, sig };
    console.log(`  ✓ ${id.padEnd(18)} ${pmeta.width}×${pmeta.height} · ${out.dur.toFixed(1)} s · ${(buf.length / 1048576).toFixed(2)} MB${pr.hdr ? " · " + pr.hdr + "→SDR" : ""}${out.audio ? " · con sonido" : ""} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  const total = Object.values(manifest).reduce((a, m) => a + m.bytes, 0);
  console.log(`\n✓ ${Object.keys(manifest).length} videos en assets/video/ · ${(total / 1048576).toFixed(1)} MB en total`);
})().catch((e) => { console.error("\n✗ " + e.message + "\n"); process.exit(1); });
