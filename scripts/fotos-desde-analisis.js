/* =============================================================
   fotos-desde-analisis.js — arma fotos.js con TODAS las fotos de Julián
   -------------------------------------------------------------
   Uso:   node scripts/fotos-desde-analisis.js            (no pisa un fotos.js existente)
          node scripts/fotos-desde-analisis.js --force    (lo rehace: se pierden los alt corregidos a mano)

   Braian (19/10/2026): «que aparezcan todas las fotos» y «en todas las fotos hay consentimiento de uso».
   Cada serie del sitio muestra primero las elegidas (PROJECTS[].frames, en content.js) y debajo, en un
   desplegable, todas las demás de su carpeta: esas son las que lista este archivo.

   De dónde sale cada dato:
     - la lista de fotos y su descripción: la tabla «una fila por foto» de _analisis/material.md
       (columna «qué se ve», escrita mirando cada foto); se limpia de rótulos internos («808traparty:»,
       «show grande 30/04/2026:», «misma toma que…», suposiciones entre paréntesis) y queda como texto alternativo;
     - la serie: la carpeta del cliente y, para las de Behance, el número de proyecto del nombre del archivo
       (186716159 = Cumpleaños de XV · 228458489 = Casamiento Nati y Seba · 207704075 = 808traparty);
     - el orden: la fecha de captura del EXIF (las que no tienen, por nombre).
   ============================================================= */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "fotos.js");
const C0 = { SOURCE: "1 CARPETA PARA BRAI" };
if (fs.existsSync(OUT) && !process.argv.includes("--force")) { console.error("\n✗ fotos.js ya existe (puede tener alt corregidos a mano). Para rehacerlo: --force\n"); process.exit(1); }

const md = fs.readFileSync(path.join(ROOT, "_analisis", "material.md"), "utf8");
// carpeta de cada tanda (los encabezados de material.md)
const FOLDER = { "EVENTOS-SHOWS (1.ª mitad)": "EVENTOS-sHOWS", "EVENTOS-SHOWS (2.ª mitad)": "EVENTOS-sHOWS", "MODA FTS DE ESTUDIO": "MODA FTS DE ESTUDIO", "BOOKS": "BOOKS",
  "XV Y CASAMIENTOS": "XV Y CASAMIENTOS", "FOTO PRODUCTO": "FOTO PRODUCTO", "AIRE LIBRE": "AIRE LIBRE" };
const GROUP = { "EVENTOS-sHOWS": "vivo", "MODA FTS DE ESTUDIO": "moda", "BOOKS": "books", "XV Y CASAMIENTOS": "boda", "FOTO PRODUCTO": "producto", "AIRE LIBRE": "aire" };

let folder = null;
const rows = [];
for (const line of md.split("\n")) {
  const h = line.match(/^# Tanda: (.+)$/);
  if (h) { folder = FOLDER[h[1].trim()]; continue; }
  if (!folder || !/^\|\s*[^|\s-][^|]*\.(jpe?g|png)\s*\|/i.test(line)) continue;
  const c = line.split("|").map((x) => x.trim());
  rows.push({ folder, f: c[1].replace(/`/g, ""), que: c[2] });
}

const serieOf = (folder, f) => {
  if (folder === "EVENTOS-sHOWS") return /207704075/.test(f) ? "808" : "en-vivo";
  if (folder === "MODA FTS DE ESTUDIO") return "moda";
  if (folder === "FOTO PRODUCTO") return "producto";
  if (folder === "AIRE LIBRE") return "paisajes";
  if (/228458489/.test(f)) return "casamiento";
  if (/186716159/.test(f)) return "xv";
  return folder === "BOOKS" ? "books" : "xv";   // en XV Y CASAMIENTOS, lo que no es del casamiento es de XV
};

/* el texto alternativo: lo que se ve, sin rótulos internos ni suposiciones */
function altOf(que) {
  let s = que;
  s = s.replace(/^\s*B\/N:\s*/i, "En blanco y negro, ");
  // rótulo inicial «algo:» (contexto interno: serie, fecha, lugar), solo si es corto y no es una oración
  s = s.replace(/^([^:]{2,70}):\s+(?=\S)/, (m, pre) => /\b(canta|mira|posa|sostiene|baila|está|son|hay)\b/i.test(pre) ? m : "");
  s = s.replace(/\([^)]*(¿|\?|parece|probabl|quiz|DSC|IMG_|_MG_|\b[0-9a-f]{6}\b|mismo d[ií]a)[^)]*\)/gi, "");
  s = s.replace(/\b(misma|mismo|otra|otro) (toma|plano|momento|escena) (que|de) [\w.-]+,?\s*/gi, "");
  s = s.replace(/\s+(de|que en|como en)\s+_?(DSC|IMG|MG)_?\d{3,5}(-\d)?\b/gi, "");
  s = s.replace(/_?\b(DSC|IMG|MG)_?\d{3,5}(-\d)?\b/g, "").replace(/\b[0-9a-f]{6}\d{9}\.[0-9a-f]+\b/g, "");
  // «El mismo carancho», «La misma mano», «Mismo frasco»: remiten a otra foto, que en el visor puede no estar al lado
  s = s.replace(/^(El|La|Los|Las) mism[oa]s? /i, (m, art) => art + " ").replace(/^Mism([oa])s? /i, (m, g) => (g === "a" ? "La " : "El "));
  s = s.replace(/,? (ahora|un instante después|otra vez)\b/gi, "");
  s = s.replace(/[«»]/g, "«").replace(/«([^«]*)«/g, "«$1»");
  s = s.replace(/\s*;\s*/g, ", ").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").replace(/^[\s,.:;-]+/, "").trim();
  if (s.length > 230) {   // se corta en la última coma (o palabra) y sin dejar colgando una preposición
    const cut = s.slice(0, 230), comma = cut.lastIndexOf(",");
    s = cut.slice(0, comma > 140 ? comma : cut.lastIndexOf(" "));
    s = s.replace(/[,\s]+(a|al|de|del|la|el|y|con|en|una|un|que|por|los|las)$/i, "").replace(/[,\s]+$/, "");
  }
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?»]$/.test(s)) s += ".";
  return s;
}

const slug = (f) => f.replace(/\.[^.]+$/, "").toLowerCase().replace(/kalani x jottavisuals-/, "kalani-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

(async () => {
  const out = [];
  for (const r of rows) {
    const file = path.join(ROOT, C0.SOURCE, "fotos", r.folder, r.f);
    if (!fs.existsSync(file)) throw new Error("No existe " + file);
    const meta = await sharp(fs.readFileSync(file)).metadata();
    const { readShot } = require("./lib");
    const shot = readShot(meta.exif);
    out.push({ serie: serieOf(r.folder, r.f), g: GROUP[r.folder], f: r.f, alt: altOf(r.que), date: (shot && shot.date) || "" });
  }
  const order = (a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : 0) || a.f.localeCompare(b.f);
  const SERIES = {};
  for (const x of out.sort(order)) (SERIES[x.serie] = SERIES[x.serie] || []).push(x);
  const used = new Set();
  let js = `/* =============================================================
   TODAS las fotos de Julián (${out.length}), por serie. Lo arma scripts/fotos-desde-analisis.js
   desde _analisis/material.md; los textos alternativos se pueden corregir a mano acá.
   Cada serie del sitio muestra primero sus elegidas (content.js → PROJECTS[].frames)
   y debajo, en un desplegable, el resto de esta lista (sin repetir las elegidas).
   g = carpeta (GROUPS de content.js) · f = archivo · alt = qué se ve · date = fecha de captura (EXIF)
   ============================================================= */
const SERIES = {
`;
  for (const [k, list] of Object.entries(SERIES)) {
    js += `  "${k}": [   // ${list.length} fotos\n`;
    for (const x of list) {
      let id = `${k}-${slug(x.f)}`; while (used.has(id)) id += "x"; used.add(id);
      js += `    { id: ${JSON.stringify(id)}, g: "${x.g}", f: ${JSON.stringify(x.f)}, date: "${x.date}", alt: ${JSON.stringify(x.alt)} },\n`;
    }
    js += `  ],\n`;
  }
  js += `};\n\nmodule.exports = { SERIES };\n`;
  fs.writeFileSync(OUT, js);
  console.log(`\n✓ fotos.js: ${out.length} fotos en ${Object.keys(SERIES).length} series: ` + Object.entries(SERIES).map(([k, l]) => `${k} ${l.length}`).join(" · ") + "\n");
})().catch((e) => { console.error("\n✗ " + e.message + "\n"); process.exit(1); });
