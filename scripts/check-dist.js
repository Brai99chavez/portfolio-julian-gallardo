/* =============================================================
   check-dist.js — revisa dist/ antes de subirlo (npm run check)
   -------------------------------------------------------------
   1) toda referencia local (src, href, srcset, data-src, data-zoom, poster) existe, también archivo#ancla
   2) ningún original sin optimizar (solo .webp con hash, .mp4 con hash, og.jpg y el logo)
   3) no viajan la carpeta de originales, _analisis/, _versiones/, _fuentes/, scripts/, content.js ni .md
   4) en lo publicado no hay rutas de esta compu, localhost, nombres internos ni claves
   5) cada página: title, description, lang, un solo h1, alt descriptivo, rel=noopener en target=_blank
   Sale con error si algo falla.
   ============================================================= */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, process.env.DIST || process.argv[2] || "dist");
const C = require(path.join(ROOT, "content.js"));
const errs = [];
const bad = (m) => errs.push(m);

if (!fs.existsSync(path.join(DIST, "index.html"))) { console.error("\n✗ No hay dist/ — corré npm run build:revision (o npm run build)\n"); process.exit(1); }
const all = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : all.push(path.relative(DIST, p).split(path.sep).join("/")); } })(DIST);

// 2) y 3)
for (const f of all) {
  if (/(^|\/)(1 CARPETA PARA BRAI|contenido|_originales|_analisis|_versiones|_fuentes|scripts|node_modules)(\/|$)/.test(f)) bad(`viaja una carpeta interna: ${f}`);
  if (/(^|\/)content\.js$|\.md$|\.zip$/.test(f)) bad(`viaja un archivo interno: ${f}`);
  if (/^assets\/img\//.test(f) && !/^assets\/img\/[a-z0-9-]+-\d+w-[0-9a-f]{8}\.webp$/.test(f)) bad(`imagen sin optimizar o sin hash: ${f}`);
  if (/^assets\/video\//.test(f) && !/^assets\/video\/[a-z0-9-]+-[0-9a-f]{8}\.(mp4|webp)$/.test(f)) bad(`video sin optimizar o sin hash: ${f}`);
  if (/\.(jpe?g|png|heic|mov)$/i.test(f) && f !== "assets/og.jpg") bad(`original sin optimizar: ${f}`);
}

// 1), 4) y 5)
const pages = ["index.html", "trabajos.html"];
const html = Object.fromEntries(pages.map((p) => [p, fs.readFileSync(path.join(DIST, p), "utf8")]));
const texts = [...pages, "assets/css/site.css", "assets/js/app.js", "_headers", "robots.txt"];
for (const f of texts) {
  const s = fs.readFileSync(path.join(DIST, f), "utf8");
  for (const [re, what] of [[/[A-Z]:\\\\Users|[A-Z]:\/Users|\/Users\/chave|chave/i, "ruta de esta compu"], [/localhost|127\.0\.0\.1/, "localhost"],
                            [/_analisis|pendientes\.md|_versiones|CARPETA PARA BRAI|scratchpad/i, "nombre interno"],
                            [/(api[_-]?key|secret|token|password)\s*[:=]/i, "algo que parece una clave"]]) if (re.test(s)) bad(`${f}: ${what}`);
}
for (const [p, h] of Object.entries(html)) {
  const refs = [...h.matchAll(/\s(?:src|href|data-src|data-zoom|poster)="([^"]+)"/g)].map((m) => m[1])
    .concat([...h.matchAll(/\s(?:srcset|data-srcset)="([^"]+)"/g)].flatMap((m) => m[1].split(",").map((x) => x.trim().split(/\s+/)[0])));
  for (const r of refs) {
    if (/^(https?:|mailto:|tel:|data:|#$)/.test(r)) continue;
    const [withQuery, anchor] = r.split("#");
    const file = withQuery.split("?")[0];   // el ?v=hash del CSS y el JS no es parte del nombre
    if (file && !fs.existsSync(path.join(DIST, decodeURIComponent(file)))) bad(`${p}: falta ${file}`);
    if (anchor) { const target = file ? html[file] : h; if (target === undefined) bad(`${p}: ancla a una página que no se revisa: ${r}`); else if (!target.includes(`id="${anchor}"`)) bad(`${p}: ancla rota ${r}`); }
  }
  if (!/<title>[^<]{10,60}<\/title>/.test(h)) bad(`${p}: title ausente o de más de 60 caracteres`);
  if (!/<meta name="description" content="[^"]{50,160}"/.test(h)) bad(`${p}: description ausente o fuera de 50–160`);
  if (!/<html lang="es-AR"[\s>]/.test(h)) bad(`${p}: lang`);
  const h1 = (h.match(/<h1[\s>]/g) || []).length; if (h1 !== 1) bad(`${p}: ${h1} h1`);
  for (const [tag] of h.matchAll(/<img\b[^>]*>/g)) {
    const alt = (tag.match(/\salt="([^"]*)"/) || [])[1];
    if (alt === undefined) bad(`${p}: img sin alt: ${tag.slice(0, 80)}`);
    // alt vacío a propósito: decorativas o repetidas de algo que ya tiene texto (la tarjeta lleva el título; los fotogramas
    // extra del videoclip y la miniatura de «qué hago» acompañan a un texto; el sello; la vista previa que sigue al mouse)
    else if (alt === "" && !/lb__img|pick__img|reel__poster|nav__seal|footer__seal|contact__stamp|svc__thumb|clip__f--[12]|src="data:image\/gif/.test(tag)) bad(`${p}: alt vacío en una imagen de contenido: ${tag.slice(0, 90)}`);
    else if (alt && alt.length < 12) bad(`${p}: alt demasiado corto («${alt}»)`);
  }
  for (const [tag] of h.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener/.test(tag)) bad(`${p}: target=_blank sin noopener: ${tag.slice(0, 80)}`);
  if (/<!--[^>]*(_analisis|pendientes)/.test(h)) bad(`${p}: un comentario menciona carpetas internas`);
}
const robots = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8");
const modo = /Disallow:\s*\/\s*$/m.test(robots) ? "REVISIÓN (no indexable)" : "PUBLICACIÓN (indexable)";
if (/REVISIÓN/.test(modo) && !/noindex/.test(html["index.html"])) bad("modo revisión sin meta noindex");

console.log(`\n${errs.length ? "✗" : "✓"} ${path.basename(DIST)}/: ${all.length} archivos · modo ${modo}`);
if (errs.length) { console.log("  " + errs.join("\n  ")); process.exit(1); }
console.log("  referencias, originales, archivos internos, rutas/claves, title, description, lang, h1, alt y noopener: en verde\n");
