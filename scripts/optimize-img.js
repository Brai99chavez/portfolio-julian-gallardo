/* =============================================================
   optimize-img.js — genera las imágenes del sitio desde contenido/
   -------------------------------------------------------------
   Uso:   npm run optimize
          ONLY=808-flyer,sol-claqueta npm run optimize   (solo esas)
          Q=88 npm run optimize                          (calidad de fotos grandes; def. 90)

   Por cada imagen declarada en IMAGES (content.js):
     - respeta la orientación EXIF (.rotate()) y luego QUITA TODO EL EXIF
       (incluido GPS): sharp no copia metadatos si no se le pide.
     - TRES funciones por imagen (cada variante lleva su "role" en el manifest):
         card .. las tarjetas de las galerías y el hero  (vertical 540/1080 · horizontal 800/1600)
         big ... lo primero que muestra el visor, y el hero en pantallas retina (1440 · 2200)
         zoom .. se baja SOLO cuando alguien hace zoom en el visor           (2160 · 2880)
       El navegador elige sola según el dispositivo y solo descarga lo que usa.
       Nunca agranda: si el original es más chico, no se genera esa medida;
       el zoom solo existe si aporta al menos 20 % más de píxeles que "big".
     - CALIDAD (WebP):
         fotos de más de 800 px ........ q90  (las tomas nocturnas y con grano pierden
                                               mucho a q78: se "encera" el grano)
         fuentes de ≤ 800 px ........... q95  (ya vienen comprimidas por WhatsApp:
                                               recomprimir más empeora lo que ya hay)
         por imagen: IMAGES[id].q en content.js pisa estos valores
     - MIDE la pérdida de cada variante (PSNR contra el original reducido SIN
       comprimir): avisa por debajo de 34 dB y FALLA por debajo de 30 dB.
     - nombre con hash del contenido: <id>-<ancho>w-<hash>.webp
       (por eso se puede cachear un año sin riesgo de ver versiones viejas).
   Las salidas se ordenan en subcarpetas por trabajo: assets/img/<carpeta>/<id>-<ancho>w-<hash>.webp (IMAGES[id].dir en content.js).
   Con MISSING=1 (npm run fotos) solo procesa lo nuevo o cambiado y limpia lo que ya no está.
   Escribe assets/img/manifest.json, que usa el build.
   Los originales de contenido/ no se tocan.
   ============================================================= */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const { resolveImage, readShot } = require("./lib");

const ROOT = path.resolve(__dirname, "..");
const { GROUPS, IMAGES, SOURCE = "contenido" } = require(path.join(ROOT, "content.js"));
const SRC = path.join(ROOT, SOURCE);   // la carpeta de originales del cliente (no se mueve ni se publica)
const OUT = path.join(ROOT, "assets", "img");

const Q = parseInt(process.env.Q || "90", 10);
const Q_LOW = 95;
let ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const subdir = (id) => IMAGES[id].dir || "";
const walkFiles = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walkFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];
const statOf = (id) => { const st = fs.statSync(resolveImage(SRC, GROUPS, IMAGES[id])); return { size: st.size, mtime: Math.round(st.mtimeMs) }; };
if (process.env.MISSING) {
  const mp = path.join(OUT, "manifest.json");
  const have = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, "utf8")) : {};
  // 1) lo que ya no está en content.js (se borró la foto o la carpeta): se limpian sus archivos y su entrada
  const gone = Object.keys(have).filter((id) => !IMAGES[id]);
  for (const id of gone) { for (const v of have[id].variants) fs.rmSync(path.join(OUT, v.file), { force: true }); delete have[id]; }
  for (const d of fs.readdirSync(OUT, { withFileTypes: true })) if (d.isDirectory() && !fs.readdirSync(path.join(OUT, d.name)).length) fs.rmdirSync(path.join(OUT, d.name));   // carpetas de series que quedaron vacías
  if (gone.length) { fs.writeFileSync(mp, JSON.stringify(have, null, 1)); console.log(`\n  ✂ Se limpiaron ${gone.length} imagen(es) que ya no están: ${gone.join(", ")}`); }
  // 2) lo nuevo, lo que cambió de carpeta o de «lite», y lo que cambió el ARCHIVO ORIGINAL (tamaño o fecha)
  const inDir = (id) => have[id].variants.every((v) => (subdir(id) ? v.file.startsWith(subdir(id) + "/") : !v.file.includes("/")));
  ONLY = new Set(Object.keys(IMAGES).filter((id) => {
    if (!have[id] || (!!have[id].lite) !== !!IMAGES[id].lite || !inDir(id) || !have[id].src) return true;
    const st = statOf(id);
    return have[id].src.size !== st.size || have[id].src.mtime !== st.mtime;
  }));
  if (!ONLY.size) { console.log("\n✓ No hay imágenes nuevas ni cambiadas para optimizar\n"); process.exit(0); }
}
const PORTRAIT = { card: [540, 1080], big: 1440, zoom: 2160 };
const LANDSCAPE = { card: [800, 1600], big: 2200, zoom: 2880 };
const LOW_MAX = 800;
const PSNR_WARN = 34, PSNR_FAIL = 30;

const kb = (n) => (n / 1024).toFixed(0).padStart(5) + " KB";

/* Qué medidas generar para una imagen de dw px de ancho: [{ w, role }]
   lite = foto del desplegable «Ver las N fotos más» (IMAGES[id].lite): una sola medida de tarjeta y la del visor, sin la de zoom
   (el visor igual acerca hasta 4× sin ella). Son ~290 fotos: con los tres roles completos el sitio pasaba de 120 a ~400 MB. */
function pickVariants(dw, dh, lite = false) {
  if (dw <= LOW_MAX) return [{ w: dw, role: "card" }];            // ya viene chica (WhatsApp): no se agranda
  const t = dh > dw ? PORTRAIT : LANDSCAPE;
  if (lite) {
    const card = Math.min(t.card[0], dw), out = [{ w: card, role: "card" }];
    if (Math.min(t.big, dw) > card * 1.1) out.push({ w: Math.min(t.big, dw), role: "big" });
    return out;
  }
  let cards = t.card.filter((w) => w <= dw);
  if (!cards.length) cards = [dw];
  // entre dos medidas de tarjeta (las que llegan por WhatsApp, ~1000 px; los fotogramas de YouTube, 1280), el original entero
  // es la tarjeta grande. Antes quedaba solo para el zoom, y en un retina la portada y «Sobre mí» se veían en 540 px estirados
  if (t.card.some((w) => w > dw) && dw > cards[cards.length - 1] * 1.1) cards.push(dw);
  const out = cards.map((w) => ({ w, role: "card" }));
  const top = cards[cards.length - 1];
  if (t.big <= dw && t.big > top * 1.1) out.push({ w: t.big, role: "big" });
  const base = out[out.length - 1].w;
  const zoomW = Math.min(t.zoom, dw);
  if (zoomW >= base * 1.2) out.push({ w: zoomW, role: "zoom" });
  return out;
}

/* PSNR en dB entre dos buffers crudos del mismo tamaño (>40 indistinguible, 35–40 buena, <34 se nota en zonas oscuras) */
function psnr(a, b) {
  let se = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; se += d * d; }
  const mse = se / a.length;
  return mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifestPath = path.join(OUT, "manifest.json");
  let manifest = {};
  if (ONLY && fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  else for (const f of walkFiles(OUT)) if (/[.](webp|json)$/.test(f)) fs.rmSync(f);

  const ids = Object.keys(IMAGES).filter((id) => !ONLY || ONLY.has(id));
  if (ONLY) for (const id of ONLY) if (!IMAGES[id]) throw new Error(`ONLY: no existe la imagen "${id}"`);

  let totalOut = 0, withExif = 0, lowest = { db: 99, id: "" };
  const warns = [], fails = [];
  console.log(`\nOptimizando ${ids.length} imágenes (WebP: q${Q} fotos · q${Q_LOW} fuentes ≤ ${LOW_MAX}px)\n`);

  for (const id of ids) {
    const file = resolveImage(SRC, GROUPS, IMAGES[id]);
    // Se lee con fs y se pasa el BUFFER a sharp: muchas rutas de contenido/ superan los
    // 260 caracteres de Windows (los nombres de carpeta son oraciones) y sharp, que no usa
    // rutas largas, falla con "Input file is missing". Node sí las soporta.
    const input = fs.readFileSync(file);
    const meta = await sharp(input, { failOn: "none" }).metadata();
    const swap = (meta.orientation || 1) >= 5;
    const crop = IMAGES[id].crop;
    const dw = crop ? crop.width : swap ? meta.height : meta.width;
    const dh = crop ? crop.height : swap ? meta.width : meta.height;
    const q = IMAGES[id].q || (dw <= LOW_MAX ? Q_LOW : Q);
    if (ONLY) {                                            // al regenerar solo algunas, no dejar basura de la corrida anterior
      // los ids solo llevan letras, números y guiones: el prefijo + "-<ancho>w-<hash8>.webp" identifica sus variantes
      // (y no confunde "sol-claqueta" con "sol-claqueta-2": después del id exige "-<dígitos>w-")
      const old = new RegExp("^" + id + "-[0-9]+w-[0-9a-f]{8}[.]webp$");
      for (const f of walkFiles(OUT)) if (old.test(path.basename(f))) fs.rmSync(f);   // también los de una carpeta anterior
    }
    const variants = [];

    for (const { w, role } of pickVariants(dw, dh, !!IMAGES[id].lite)) {
      // crop (opcional, en px del original ya girado): para sacar una franja que no es del trabajo, como el subtítulo
      // de la letra quemado abajo en un fotograma de videoclip. Se aplica antes de achicar.
      const ex = IMAGES[id].crop;
      const resized = () => { let s = sharp(input, { failOn: "none" }).rotate(); if (ex) s = s.extract(ex); return s.resize({ width: w, withoutEnlargement: true }); };
      const { data, info } = await resized()
        .webp({ quality: q, effort: 6, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      const hash = crypto.createHash("sha1").update(data).digest("hex").slice(0, 8);
      const name = (subdir(id) ? subdir(id) + "/" : "") + `${id}-${info.width}w-${hash}.webp`;
      fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true });
      fs.writeFileSync(path.join(OUT, name), data);

      // Instrumento 1: la salida NO trae EXIF ni XMP ni GPS
      const om = await sharp(data).metadata();
      if (om.exif || om.xmp || om.iptc) withExif++;

      // Instrumento 2: cuánto se perdió (contra el mismo tamaño SIN comprimir)
      const ref = await resized().removeAlpha().raw().toBuffer();
      const dec = await sharp(data).removeAlpha().raw().toBuffer();
      const db = ref.length === dec.length ? psnr(ref, dec) : NaN;
      if (!isNaN(db)) {
        if (db < lowest.db) lowest = { db, id: `${id} ${info.width}w` };
        if (db < PSNR_FAIL) fails.push(`${id} ${info.width}w: ${db.toFixed(1)} dB`);
        else if (db < (IMAGES[id].minDb ?? PSNR_WARN)) warns.push(`${id} ${info.width}w: ${db.toFixed(1)} dB`);
      }

      variants.push({ w: info.width, h: info.height, role, file: name, bytes: data.length, db: isNaN(db) ? null : +db.toFixed(1) });
      totalOut += data.length;
    }
    // datos de la toma (texto que se muestra junto a la foto); la foto publicada no lleva EXIF
    const shot = readShot(meta.exif);
    const st = fs.statSync(file);
    manifest[id] = { w: dw, h: dh, q, src: { size: st.size, mtime: Math.round(st.mtimeMs) }, ...(shot ? { shot } : {}), ...(IMAGES[id].lite ? { lite: true } : {}), variants };
    console.log(`  ${id.padEnd(18)} ${String(dw + "×" + dh).padEnd(10)} q${q} → ` +
      variants.map((v) => `${v.w}w${v.role === "card" ? "" : "·" + v.role} ${kb(v.bytes)} ${v.db == null ? "  n/d" : v.db.toFixed(1) + "dB"}`).join("  ·  "));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  console.log(`\n✓ ${Object.keys(manifest).length} imágenes · total ${(totalOut / 1048576).toFixed(2)} MB`);
  console.log(`  Salidas con metadatos (EXIF/XMP/IPTC): ${withExif}  ${withExif === 0 ? "✓" : "✗ REVISAR"}`);
  console.log(`  Peor variante: ${lowest.id} a ${lowest.db.toFixed(1)} dB   (aviso < ${PSNR_WARN} dB · falla < ${PSNR_FAIL} dB)`);
  if (warns.length) console.log(`  ⚠ ${warns.length} variante(s) bajo ${PSNR_WARN} dB (se nota en zonas oscuras/granuladas):\n    ${warns.join("\n    ")}`);
  console.log("");
  if (withExif) process.exit(1);
  if (fails.length) { console.error(`✗ Calidad insuficiente (< ${PSNR_FAIL} dB):\n  ${fails.join("\n  ")}\n  Subí la calidad con Q=… o IMAGES[id].q en content.js\n`); process.exit(1); }
})().catch((e) => { console.error("\n✗ " + e.message + "\n"); process.exit(1); });
