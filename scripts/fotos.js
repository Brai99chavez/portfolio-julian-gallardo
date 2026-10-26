/* =============================================================
   fotos.js — «cargué fotos nuevas: que aparezcan en el sitio»   (módulo reutilizable de Portfolios)
   -------------------------------------------------------------
   Uso:   npm run fotos                     mira la carpeta de originales, optimiza SOLO lo nuevo o cambiado,
                                            limpia lo que ya no está y vuelve a armar el sitio (modo revisión)
          npm run fotos -- --sin-armar      lo mismo, sin armar el sitio al final
          npm run serie -- "Nombre"         crea la carpeta nueva con un serie.json para completar
          npm run fotos -- --baseline       (una sola vez, al instalar esto) anota todo lo que ya hay en fotos-vistas.json

   Cómo se cargan fotos: ver las reglas en el LEEME.txt de la carpeta de originales y en scripts/galeria.js.
   Lo que se publica sale ordenado en assets/img/<carpeta>/ (no se edita a mano). Los originales no se tocan ni se suben.
   ============================================================= */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const run = (script, extra = [], env = {}) => spawnSync(process.execPath, [path.join(__dirname, script), ...extra], { stdio: "inherit", env: { ...process.env, ...env }, cwd: ROOT });
const C = require(path.join(ROOT, "content.js"));
const SOURCE = C.SOURCE || "contenido";
const { writeBaseline } = require("./galeria");

/* ---- --baseline ---- */
if (args.includes("--baseline")) {
  const all = writeBaseline(ROOT, SOURCE);
  console.log(`\n✓ fotos-vistas.json: ${Object.keys(all).length} carpetas, ${Object.values(all).reduce((n, a) => n + a.length, 0)} imágenes anotadas como «ya vistas».`);
  console.log("  Desde ahora, lo que llegue a esas carpetas se detecta como nuevo. No hace falta volver a correr esto.\n");
  process.exit(0);
}

/* ---- npm run serie -- "Nombre" ---- */
const ni = args.indexOf("--nueva");
if (ni >= 0) {
  const name = (args[ni + 1] || "").trim();
  if (!name || /[\\/:*?"<>|]/.test(name)) { console.error('\n✗ Falta el nombre (sin / \\ : * ? " < > |). Ej.: npm run serie -- "Cumpleaños"\n'); process.exit(1); }
  const dir = path.join(ROOT, SOURCE, C.NEW_SERIES_DIR || "", name);
  if (fs.existsSync(dir)) { console.error(`\n✗ Ya existe ${path.relative(ROOT, dir)}/\n`); process.exit(1); }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "serie.json"), JSON.stringify({ titulo: name, intro: "", categoria: "foto", tipo: "", anio: "", lugar: "", roles: [], orden: 100, destacadas: [], fotos: {} }, null, 2) + "\n");
  console.log(`\n✓ Creé ${path.relative(ROOT, dir)}/  — copiale las fotos adentro y corré: npm run fotos`);
  console.log("  (serie.json es opcional: título, texto, año, lugar, roles, qué fotos van primero y la descripción de cada una)\n");
  process.exit(0);
}

/* ---- 1) qué hay ---- */
const F = C.FOUND;
if (F.notes.length) { F.notes.forEach((n) => console.log("  ⚠ " + n)); process.exit(1); }
const nuevas = F.report.filter((r) => r.fresh);
console.log(`\n${SOURCE}/ → sitio:  ${F.report.length} carpetas con fotos · ${nuevas.length ? nuevas.length + " con novedades" : "sin novedades"}`);
for (const r of nuevas) console.log(`  ${r.isNew ? "NUEVO trabajo" : "+" + r.fresh + " fotos"}  ${r.key}${r.isNew ? `  → «${r.title}» (${r.files} fotos)` : `  → se suman a «${r.dest}»`}`);
if (F.photos.length) {
  console.log(`\n  Fotos que llegaron solas (revisá que ninguna tenga datos personales, documentos, menores sin permiso o marcas):`);
  for (const p of F.photos) console.log(`    · ${p.f}  → ${p.project}${p.genericAlt ? "  (sin descripción: ponela en serie.json → fotos)" : ""}`);
  console.log(`  Para dejar una afuera: renombrarla con «NO_» adelante.`);
}

/* ---- 2) optimizar lo nuevo o cambiado ---- */
const r = run("optimize-img.js", [], { MISSING: "1" });
if (r.status !== 0) process.exit(r.status || 1);

/* ---- 3) armar el sitio ---- */
if (!args.includes("--sin-armar")) {
  const b = run("build.js", ["--revision"]);
  if (b.status !== 0) process.exit(b.status || 1);
}
