/* =============================================================
   disenos.js — guardar y restaurar versiones del DISEÑO (para probar rediseños sin miedo)
   -------------------------------------------------------------
   npm run diseno -- lista                    muestra las versiones guardadas
   npm run diseno -- guardar <nombre>         congela el diseño actual en _versiones/<nombre>/
   npm run diseno -- restaurar <nombre>       vuelve a esa versión y reconstruye el sitio, en el mismo modo (revisión o
                                              publicación) en que estaba dist/

   Una "versión" es la CAPA DE DISEÑO: CSS, JS del visor, index.html, plantillas, build, imagen para compartir y su plantilla.
   NO incluye content.js (los textos, proyectos y datos de contacto): restaurar un diseño nunca pisa el contenido.
   (Si una versión vieja no usa un campo nuevo de content.js, simplemente lo ignora.)

   Antes de restaurar se guarda automáticamente el estado actual como _versiones/antes-de-restaurar-<fecha>/, así que
   ir y volver entre versiones no pierde nada.
   ============================================================= */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const VERS = path.join(ROOT, "_versiones");
const FILES = [
  "assets/css/site.css",
  "assets/js/app.js",
  "assets/og.jpg",
  "index.html",
  "scripts/templates.js",
  "scripts/build.js",
  "scripts/og/og.template.html",
  "scripts/og/make-og.js",
];
// páginas que no todas las versiones tienen (trabajos.html existe desde la v1.5): se guardan y restauran si están
const OPTIONAL = ["trabajos.html"];
// copia los opcionales de una carpeta a otra: si en el origen no está, en el destino se borra (para que quede igual)
const syncOptional = (from, to) => { for (const f of OPTIONAL) {
  const a = path.join(from, f), b = path.join(to, f);
  if (fs.existsSync(a)) { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); } else if (fs.existsSync(b)) fs.rmSync(b);
} };

const [cmd, name] = process.argv.slice(2);
const fail = (m) => { console.error("\n✗ " + m + "\n"); process.exit(1); };
const dirOf = (n) => path.join(VERS, n);
const valid = (n) => /^[a-z0-9][a-z0-9._-]*$/i.test(n || "");

function save(n) {
  if (!valid(n)) fail("Nombre inválido (usá letras, números, guiones): " + n);
  const d = dirOf(n);
  if (fs.existsSync(d)) fail(`Ya existe la versión "${n}". Elegí otro nombre o borrá _versiones/${n}.`);
  for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) fail("Falta " + f);
    fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true });
    fs.copyFileSync(src, path.join(d, f));
  }
  syncOptional(ROOT, d);
  const extra = OPTIONAL.filter((f) => fs.existsSync(path.join(d, f))).length;
  console.log(`\n✓ Guardado el diseño actual como "${n}"  (${FILES.length + extra} archivos en _versiones/${n}/)\n`);
}

function list() {
  if (!fs.existsSync(VERS)) return console.log("\n(no hay versiones guardadas)\n");
  const v = fs.readdirSync(VERS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  console.log("\nVersiones guardadas en _versiones/:\n" + (v.map((x) => "  · " + x).join("\n") || "  (ninguna)") + "\n");
}

function restore(n) {
  if (!valid(n)) fail("Nombre inválido: " + n);
  const d = dirOf(n);
  if (!fs.existsSync(d)) fail(`No existe la versión "${n}". Mirá las disponibles con: npm run diseno -- lista`);
  const missing = FILES.filter((f) => !fs.existsSync(path.join(d, f)));
  if (missing.length) fail(`La versión "${n}" está incompleta (faltan: ${missing.join(", ")}). No se tocó nada.`);

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const backup = "antes-de-restaurar-" + stamp;
  if (fs.existsSync(dirOf(backup))) fail("Ya hay un respaldo de este segundo; esperá un instante y reintentá.");
  save(backup);

  // se reconstruye en el MISMO modo en que estaba dist/: si estaba en revisión (no indexable), sigue así. Antes reconstruía
  // siempre en modo publicación, y volver atrás un diseño dejaba el link de revisión indexable sin avisar.
  const robots = path.join(ROOT, "dist", "robots.txt");
  const revision = fs.existsSync(robots) && /^Disallow:\s*\/\s*$/m.test(fs.readFileSync(robots, "utf8"));
  for (const f of FILES) fs.copyFileSync(path.join(d, f), path.join(ROOT, f));
  syncOptional(d, ROOT);
  console.log(`✓ Restaurada la versión "${n}". (Lo que había antes quedó en _versiones/${backup}/)`);
  console.log(`  Reconstruyendo el sitio en el mismo modo que tenía dist/: ${revision ? "REVISIÓN (no indexable)" : "PUBLICACIÓN"}…\n`);
  const build = () => execFileSync(process.execPath, [path.join(ROOT, "scripts", "build.js"), ...(revision ? ["--revision"] : [])], { stdio: "inherit" });
  // Todo o nada: un diseño viejo puede no saber mostrar el contenido de hoy (por ejemplo, los videos: las versiones de
  // antes del 2026-10-14 no los conocen). Si el build falla, se vuelve solo a como estaba y no queda nada a medias.
  try { build(); }
  catch {
    for (const f of FILES) fs.copyFileSync(path.join(dirOf(backup), f), path.join(ROOT, f));
    syncOptional(dirOf(backup), ROOT);
    build();
    fail(`La versión "${n}" no sabe mostrar el contenido actual de content.js (el error está arriba). Se volvió al diseño que había ` +
         `y el sitio quedó igual que antes. Para usar ese diseño, sacá de content.js lo que no conoce (por ejemplo los videos).`);
  }
}

if (cmd === "guardar") save(name);
else if (cmd === "restaurar") restore(name);
else if (cmd === "lista" || !cmd) list();
else fail('Comando desconocido. Usá: lista | guardar <nombre> | restaurar <nombre>');
