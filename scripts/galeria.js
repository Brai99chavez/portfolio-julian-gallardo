/* =============================================================
   galeria.js — lo que hay en la carpeta de originales se vuelve sitio, sin tocar código
   (módulo reutilizable de Portfolios: copiado a scripts/ de cada proyecto; ver REGLAS/modulo-carga-de-fotos/LEEME.md)
   -------------------------------------------------------------
   Reglas para quien carga fotos (no hace falta saber programar):

     1) Una foto NUEVA para un trabajo que ya existe: copiarla dentro de su carpeta de originales y correr  npm run fotos
        → se suma sola a ese trabajo (al final de su galería, o en «Ver las N fotos más» si el diseño lo tiene).
     2) Un trabajo NUEVO: crear una carpeta nueva (en cualquier lado dentro de la carpeta de originales) con las fotos adentro
        y correr  npm run fotos   → el sitio arma solo un trabajo nuevo. El nombre de la carpeta es el título.
     3) Una foto que NO se tiene que publicar: ponerle «NO_» adelante del nombre.
     4) (Opcional) un archivo  serie.json  dentro de la carpeta:
          { "titulo": "Nombre", "intro": "Una línea que lo presenta", "categoria": "foto", "tipo": "Sesión", "anio": "2026",
            "lugar": "Para quién o dónde", "roles": ["Fotografía"], "orden": 3, "destacadas": ["IMG_1.jpg"],
            "destino": "slug-de-un-trabajo-existente",            ← en una carpeta que ya existe: a qué trabajo van las fotos nuevas
            "destinos": { "IMG_9.jpg": "otro-slug" },
            "fotos": { "IMG_1.jpg": "Qué se ve en la foto, para quien no puede verla" } }

   «Lo nuevo» es lo que llegó DESPUÉS de la foto de partida (fotos-vistas.json: la lista de todo lo que había cuando se
   instaló esto; se arma con  npm run fotos -- --baseline  y no se toca más). Así las fotos que a propósito no se usaron
   no aparecen solas. Una carpeta que ya existía sin trabajo (en fotos-vistas.json) se vuelve trabajo si se le agrega un serie.json.

   Este archivo solo LEE las carpetas y devuelve datos; no escribe nada (salvo writeBaseline). Lo usa content.js.
   ============================================================= */
const fs = require("fs");
const path = require("path");

const nfc = (s) => s.normalize("NFC");
const EXT = /\.(jpe?g|png|webp)$/i;
const slugify = (s) => nfc(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const prettify = (name) => {
  const t = nfc(name).replace(/^[\d\s._-]+/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : nfc(name);
};
const natural = (a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
const BASELINE = "fotos-vistas.json";

/* todas las carpetas (a cualquier profundidad) que tienen imágenes web directamente adentro: { clave "a/b/c": [archivos] } */
function scan(base) {
  const out = {};
  const walk = (dir) => {
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    const imgs = ents.filter((e) => e.isFile() && EXT.test(e.name)).map((e) => nfc(e.name)).sort(natural);
    if (imgs.length) out[path.relative(base, dir).split(path.sep).map(nfc).join("/")] = imgs;
    for (const e of ents) if (e.isDirectory() && !e.name.startsWith(".")) walk(path.join(dir, e.name));
  };
  if (fs.existsSync(base)) walk(base);
  return out;
}

function writeBaseline(root, source) {
  const all = scan(path.join(root, source));
  fs.writeFileSync(path.join(root, BASELINE), JSON.stringify(all, null, 1) + "\n");
  return all;
}

/* opts: root · source · groups ({g: ruta}) · images (IMAGES de content.js) · ownerOf(g) → slug del trabajo dueño de ese grupo
         resolveDir (de lib.js, para rutas viejas por prefijo) · mainPerSeries · defaults { cat, kind } · takenSlugs (slugs de trabajos ya existentes) */
function discover({ root, source, groups, images, ownerOf, resolveDir, mainPerSeries = 8, defaults = {}, takenSlugs = [] }) {
  const base = path.join(root, source);
  const out = { photos: [], groups: {}, projects: [], report: [], notes: [] };
  if (!fs.existsSync(base)) return out;
  const baseFile = path.join(root, BASELINE);
  const baseline = fs.existsSync(baseFile) ? JSON.parse(fs.readFileSync(baseFile, "utf8")) : null;
  if (!baseline) { out.notes.push(`Falta ${BASELINE}: correr  npm run fotos -- --baseline  una vez (guarda qué había al empezar).`); return out; }

  // grupo → clave de carpeta
  const keyOf = new Map();
  for (const [g, spec] of Object.entries(groups)) {
    const pre = `./${source}/`;
    if (spec.startsWith(pre)) keyOf.set(nfc(spec.slice(pre.length)), g);
    else if (!spec.startsWith("./") && resolveDir) { try { keyOf.set(path.relative(base, resolveDir(base, spec)).split(path.sep).map(nfc).join("/"), g); } catch { /* ambiguo: se ignora */ } }
  }
  const used = new Map();                                 // g → archivos ya declarados
  const usedIds = new Set(Object.keys(images));
  for (const im of Object.values(images)) { if (!used.has(im.g)) used.set(im.g, new Set()); used.get(im.g).add(nfc(im.f)); }
  const taken = new Set([...takenSlugs, ...Object.keys(groups)]);

  const dirs = scan(base);
  const keys = Object.keys(dirs).sort(natural);
  const newSeries = [];
  for (const key of keys) {
    const dir = path.join(base, ...key.split("/"));
    let meta = {}, hasMeta = false;
    const mp = path.join(dir, "serie.json");
    if (fs.existsSync(mp)) {
      try { meta = JSON.parse(fs.readFileSync(mp, "utf8")); hasMeta = true; }
      catch (e) { throw new Error(`${source}/${key}/serie.json no es un JSON válido: ${e.message}`); }
    }
    const files = dirs[key].filter((f) => !/^NO_/i.test(f));
    const known = keyOf.get(key);
    const seen = new Set((baseline[key] || []).map(nfc));
    const nuevoIds = (g, list) => list.map((f) => {
      let id = `${g}-${slugify(f.replace(EXT, "")) || "foto"}`, k = 2; const id0 = id;
      while (usedIds.has(id)) id = `${id0}-${k++}`;
      usedIds.add(id);
      return { id, g, f };
    });
    if (known) {
      const have = used.get(known) || new Set();
      const fresh = files.filter((f) => !have.has(f) && !seen.has(f));
      if (!fresh.length) { out.report.push({ key, g: known, isNew: false, files: files.length, fresh: 0 }); continue; }
      const mine = nuevoIds(known, fresh);
      const dest = meta.destino || ownerOf(known);
      mine.forEach((p, i) => {
        const to = (meta.destinos && meta.destinos[p.f]) || dest;
        const alt = (meta.fotos && meta.fotos[p.f]) || null;
        out.photos.push({ ...p, project: to, alt: alt || `Foto nueva de ${prettify(path.basename(key))} (${i + 1})`, genericAlt: !alt, auto: true });
      });
      out.report.push({ key, g: known, isNew: false, files: files.length, fresh: fresh.length, dest });
    } else if (!(key in baseline) || hasMeta) {
      if (!files.length) continue;
      const title = meta.titulo || prettify(path.basename(key));
      let g = slugify(title) || "serie", n = 2; const g0 = g;
      while (taken.has(g)) g = `${g0}-${n++}`;
      taken.add(g);
      out.groups[g] = `./${source}/${key}`;
      const photos = nuevoIds(g, files);
      const star = new Set((meta.destacadas || []).map(nfc));
      photos.forEach((p, i) => {
        const alt = (meta.fotos && meta.fotos[p.f]) || null;
        out.photos.push({ ...p, project: g, alt: alt || `${title}: foto ${i + 1}`, genericAlt: !alt, auto: true, main: star.size ? star.has(p.f) : i < mainPerSeries });
      });
      const main = photos.filter((p) => (star.size ? star.has(p.f) : photos.indexOf(p) < mainPerSeries)).map((p) => p.id);
      newSeries.push({
        order: Number.isFinite(meta.orden) ? meta.orden : 1000,
        project: { slug: g, cat: meta.categoria || defaults.cat || "foto", title, kind: meta.tipo || defaults.kind || "", year: meta.anio || "", where: meta.lugar || "",
                   text: meta.intro || "", roles: meta.roles || [], frames: main.length ? main : [photos[0].id], more: photos.map((p) => p.id).filter((id) => !main.includes(id)), auto: true },
      });
      out.report.push({ key, g, isNew: true, files: files.length, fresh: files.length, title });
    } else {
      out.report.push({ key, g: null, isNew: false, files: files.length, fresh: 0, inactive: true });
    }
  }
  newSeries.sort((a, b) => a.order - b.order || natural(a.project.title, b.project.title));
  out.projects = newSeries.map((s) => s.project);
  return out;
}

module.exports = { discover, writeBaseline, scan, slugify, prettify, BASELINE };
