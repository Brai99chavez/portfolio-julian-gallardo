/* =============================================================
   lib.js — helpers compartidos por optimize-img.js y build.js
   ============================================================= */
const fs = require("fs");
const path = require("path");

const nfc = (s) => s.normalize("NFC");

/* Resuelve una carpeta de contenido/ por el COMIENZO del nombre de cada tramo, A CUALQUIER PROFUNDIDAD.
   "PRODUCCIONES CINEMATOGRÁFICAS_/_Brujas"  ->  ruta real completa, esté donde esté.
   A cualquier profundidad porque el material se reorganiza: el 2026-10-14 todo pasó a estar dentro de
   «PORTFOLIO CHUNI._/PRODUCCIÓN_/…» y la búsqueda desde la raíz dejó de encontrar las 35 fotos del sitio.
   Falla con un mensaje claro si no hay exactamente una coincidencia (nunca elige una al azar). */
function resolveDir(base, spec) {
  const segs = spec.split("/").map(nfc);
  const hits = [];
  const walk = (dir, trail) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(dir, e.name), t = [...trail, nfc(e.name)];
      if (t.length >= segs.length && segs.every((s, i) => t[t.length - segs.length + i].startsWith(s))) hits.push(p);
      walk(p, t);
    }
  };
  walk(base, []);
  if (hits.length !== 1) {
    throw new Error(`Carpeta "${spec}" dentro de ${base}: ${hits.length} coincidencias (se esperaba 1)` +
      (hits.length ? ":\n  " + hits.map((h) => path.relative(base, h)).join("\n  ") : ""));
  }
  return hits[0];
}

/* Ruta real de una imagen declarada en content.js (grupo + nombre de archivo).
   Un grupo que empieza con «./» es una carpeta del proyecto (por ejemplo _fuentes/youtube, los fotogramas que baja
   scripts/youtube-frames.js) y no de la carpeta de originales del cliente: se toma tal cual, sin buscar por prefijo. */
const ROOT = path.resolve(__dirname, "..");
function resolveImage(contentDir, groups, img) {
  if (!groups[img.g]) throw new Error(`Grupo desconocido: "${img.g}"`);
  const spec = groups[img.g];
  const dir = spec.startsWith("./") ? path.join(ROOT, spec) : resolveDir(contentDir, spec);
  if (!fs.existsSync(dir)) throw new Error(`No existe la carpeta ${dir}` + (spec.includes("youtube") ? " — corré: npm run youtube" : ""));
  const hit = fs.readdirSync(dir).find((n) => nfc(n) === nfc(img.f));
  if (!hit) throw new Error(`No existe "${img.f}" en ${dir}`);
  return path.join(dir, hit);
}

/* Datos de la toma desde el EXIF del ORIGINAL (diafragma, velocidad, ISO, focal y fecha de captura). Se muestran como texto
   al lado de cada foto, como los datos del borde de una película. Las imágenes publicadas igual salen SIN EXIF (el optimizador
   lo comprueba). Lector mínimo de TIFF/EXIF (IFD0 → subIFD Exif), sin dependencias; si algo no cuadra, devuelve null. */
function readShot(exifBuf) {
  try {
    if (!exifBuf) return null;
    let b = exifBuf;
    if (b.slice(0, 6).toString("latin1") === "Exif\0\0") b = b.slice(6);
    const le = b.slice(0, 2).toString("latin1") === "II";
    const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
    const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
    const ifd = (off) => {
      const n = u16(off), tags = {};
      for (let i = 0; i < n; i++) {
        const e = off + 2 + i * 12, tag = u16(e), type = u16(e + 2), count = u32(e + 4), vo = e + 8;
        const ptr = (type === 5 || (type === 2 && count > 4)) ? u32(vo) : vo;
        if (type === 3) tags[tag] = u16(vo);
        else if (type === 4) tags[tag] = u32(vo);
        else if (type === 5) tags[tag] = [u32(ptr), u32(ptr + 4)];
        else if (type === 2) tags[tag] = b.slice(ptr, ptr + count - 1).toString("latin1");
      }
      return tags;
    };
    const ifd0 = ifd(u32(4));
    if (!ifd0[0x8769]) return null;
    const ex = ifd(ifd0[0x8769]);
    const rat = (r) => (r && r[1] ? r[0] / r[1] : null);
    const f = rat(ex[0x829d]), t = rat(ex[0x829a]), mm = rat(ex[0x920a]), iso = ex[0x8827] || null;
    const shot = {};
    if (f) shot.f = `f/${(Math.round(f * 10) / 10).toString().replace(".", ",")}`;
    if (t) shot.t = t >= 1 ? `${Math.round(t * 10) / 10} s`.replace(".", ",") : `1/${Math.round(1 / t)} s`;
    if (iso) shot.iso = `ISO ${iso}`;
    if (mm) shot.mm = `${Math.round(mm)} mm`;
    const d = ex[0x9003] || "";
    if (/^\d{4}:\d{2}:\d{2}/.test(d)) shot.date = d.slice(0, 10).replace(/:/g, "-");
    return Object.keys(shot).length ? shot : null;
  } catch { return null; }
}

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

module.exports = { resolveDir, resolveImage, readShot, esc, nfc };
