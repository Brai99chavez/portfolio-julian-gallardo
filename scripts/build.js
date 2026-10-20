/* =============================================================
   build.js — pre-renderiza el sitio y arma dist/ (lo ÚNICO que se publica)
   -------------------------------------------------------------
   Uso:   npm run build                 (publicación: indexable por Google)
          npm run build:revision        (para MOSTRÁRSELO AL CLIENTE antes de publicar: NO se indexa)
          SITE_URL=https://jottav.com.ar npm run build     (con dominio)

   El modo revisión agrega <meta name="robots" content="noindex">, el header X-Robots-Tag y un robots.txt que prohíbe todo:
   un link de prueba no tiene que aparecer en Google con el sitio sin terminar. NO es una protección con clave: quien tenga
   el link lo puede abrir.

   1) Lee content.js + los manifest de imágenes y videos (npm run optimize / optimize:video)
   2) Rellena index.html y trabajos.html (marcadores <!--BUILD:x--> y {{TOKENS}})
   3) Copia SOLO lo necesario a dist/ — nunca la carpeta de originales ni _analisis/
   4) Imprime el peso real y cuántos «cambiar después» quedan
   ============================================================= */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { esc } = require("./lib");
const T = require("./templates");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const C = require(path.join(ROOT, "content.js"));
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");
const REVISION = process.argv.includes("--revision");

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const hash = (s) => crypto.createHash("md5").update(s).digest("hex").slice(0, 8);
const kb = (n) => (n / 1024).toFixed(0) + " KB";
const fail = (m) => { console.error("\n✗ " + m + "\n"); process.exit(1); };

/* ---- 0) validaciones: que no se publique algo roto ---- */
const manifestPath = path.join(ROOT, "assets", "img", "manifest.json");
if (!fs.existsSync(manifestPath)) fail("Falta assets/img/manifest.json — corré primero: npm run optimize");
const M = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const videoManifestPath = path.join(ROOT, "assets", "video", "manifest.json");
const V = fs.existsSync(videoManifestPath) ? JSON.parse(fs.readFileSync(videoManifestPath, "utf8")) : {};
const VIDEOS = C.VIDEOS || {};
const isVid = (id) => !!VIDEOS[id];

const featured = C.FEATURED || [];
const usedVideos = new Set([C.HERO.video, ...C.PROJECTS.flatMap((p) => [...p.frames.filter(isVid), p.watch && p.watch.video]),
                            ...featured.map((f) => f.cover).filter(isVid)].filter(Boolean));
const usedImages = new Set([C.HERO.image, C.ABOUT.photo, ...C.PROJECTS.flatMap((p) => [...p.frames, ...(p.more || [])].filter((id) => !isVid(id))),
                            ...featured.flatMap((f) => [f.cover, ...(f.flip || [])]).filter((id) => !isVid(id)),
                            ...(C.CLIPS || []).flatMap((c) => [c.img, ...(c.flips || [])]),
                            ...((C.SERVICES && C.SERVICES.items) || []).map((s) => s.img)].filter(Boolean));
for (const id of usedVideos) {
  if (!VIDEOS[id]) fail(`content.js usa el video "${id}" pero no está declarado en VIDEOS`);
  if (!V[id]) fail(`El video "${id}" no está optimizado — corré: npm run optimize:video`);
  if (!VIDEOS[id].alt || VIDEOS[id].alt.length < 15) fail(`El video "${id}" no tiene un alt descriptivo`);
}
for (const id of usedImages) {
  if (!C.IMAGES[id]) fail(`content.js usa la imagen "${id}" pero no está declarada en IMAGES`);
  if (!M[id]) fail(`La imagen "${id}" no está optimizada — corré: npm run optimize`);
  if (!C.IMAGES[id].alt || C.IMAGES[id].alt.length < 15) fail(`La imagen "${id}" no tiene un alt descriptivo`);
}
const catKeys = new Set(C.CATEGORIES.map((c) => c.key));
for (const p of C.PROJECTS) if (!catKeys.has(p.cat)) fail(`El trabajo "${p.slug}" tiene cat "${p.cat}", que no está en CATEGORIES`);
const slugs = [...C.PROJECTS.map((p) => p.slug), "videoclips", "reels"];
if (new Set(slugs).size !== slugs.length) fail("Hay slugs de trabajo repetidos");
for (const f of featured) if (f.slug !== "videoclips" && !C.PROJECTS.some((p) => p.slug === f.slug)) fail(`FEATURED usa "${f.slug}", que no está en PROJECTS`);
// las cifras de «Sobre mí» tienen que coincidir con lo que se cuenta en el contenido (no se escriben de memoria)
const statOf = (label) => (C.ABOUT.stats.find((s) => s.label.includes(label)) || {}).n;
if (statOf("videos") && +statOf("videos") !== C.CLIPS.length) fail(`ABOUT.stats dice ${statOf("videos")} videos y CLIPS tiene ${C.CLIPS.length}`);
if (statOf("dirigidos") && +statOf("dirigidos") !== C.CLIPS.filter((c) => c.lead).length) fail(`ABOUT.stats dice ${statOf("dirigidos")} dirigidos y CLIPS marca ${C.CLIPS.filter((c) => c.lead).length} con lead`);
const badIcons = C.TOOLS.flatMap((g) => g.items).filter((t) => t.icon && !T.TOOL_ICONS[t.icon]);
if (badIcons.length) console.warn(`  ⚠ Herramientas con un ícono que no existe (va el genérico): ${badIcons.map((t) => `${t.name} → "${t.icon}"`).join(", ")}`);

/* ---- 1) SEO y compartir ---- */
const WORKS_DESC = `Trabajos de ${C.SITE.name}: ${C.CLIPS.length} videoclips con su rol, video para marcas y ${C.PROJECTS.filter((p) => p.cat === "foto").length} series de fotos (shows, moda, producto, casamiento y paisaje).`;
const PAGES = {
  home:  { file: "index.html",    url: "/",              title: `${C.SITE.name} — ${C.SITE.role}`, desc: C.SITE.description },
  works: { file: "trabajos.html", url: "/trabajos.html", title: `Trabajos — ${C.SITE.name}`,      desc: WORKS_DESC },
};
for (const [k, P] of Object.entries(PAGES)) {
  if (P.title.length > 60) fail(`El título de ${k} tiene ${P.title.length} caracteres (máx. 60)`);
  if (P.desc.length > 160) fail(`La descripción de ${k} tiene ${P.desc.length} caracteres (máx. ~155)`);
}
function seoHTML(page = "home") {
  const { SITE, HERO } = C;
  const P = PAGES[page];
  const og = fs.existsSync(path.join(ROOT, "assets", "og.jpg"));
  const lines = [
    ...(REVISION ? [`<meta name="robots" content="noindex, nofollow" />`] : []),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="${esc(SITE.lang.replace("-", "_"))}" />`,
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta property="og:title" content="${esc(P.title)}" />`,
    `<meta property="og:description" content="${esc(P.desc)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  if (SITE_URL) {
    lines.push(`<link rel="canonical" href="${SITE_URL}${P.url}" />`, `<meta property="og:url" content="${SITE_URL}${P.url}" />`);
    if (og) lines.push(`<meta property="og:image" content="${SITE_URL}/assets/og.jpg" />`,
                       `<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`,
                       `<meta property="og:image:alt" content="${esc(C.IMAGES[HERO.image].alt)}" />`);
    const sameAs = C.CONTACT.channels.filter((c) => /instagram|behance/.test(c.key) && c.href).map((c) => c.href);
    const ld = { "@context": "https://schema.org", "@type": "Person", name: SITE.name, alternateName: SITE.brand + ".",
                 jobTitle: SITE.role, url: SITE_URL + "/", ...(sameAs.length ? { sameAs } : {}),
                 ...(SITE.location ? { homeLocation: { "@type": "Place", name: SITE.location } } : {}) };
    if (page === "home") lines.push(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
  } else {
    lines.push(`<!-- ${T.PEND.toUpperCase()}: canonical, og:url, og:image y JSON-LD necesitan el dominio. Compilá con SITE_URL=https://… -->`);
  }
  return lines.join("\n  ");
}
function preloadHTML() {
  const vs = T.heroSet(T.variantsOf(M, C.HERO.image).vs);
  const srcset = vs.map((v) => `assets/img/${v.file} ${v.w}w`).join(", ");
  return `<link rel="preload" as="image" imagesrcset="${srcset}" imagesizes="${T.HERO_SIZES}" fetchpriority="high" />`;
}

/* ---- 2) armar el HTML ---- */
const css = read("assets/css/site.css"), js = read("assets/js/app.js");
const vars = {
  SITE_LANG: esc(C.SITE.lang), SITE_NAME: esc(C.SITE.name), SITE_ROLE: esc(C.SITE.role), SITE_DESC: esc(C.SITE.description),
  WORKS_DESC: esc(WORKS_DESC), V_CSS: hash(css), V_JS: hash(js),
};
const pageBlocks = {
  home: { seo: seoHTML("home"), preload: preloadHTML(), nav: T.navHTML(C, "home"), menu: T.menuHTML(C, "home"),
          hero: T.heroHTML(C, M, V), featured: T.featuredHTML(C, M, V), about: T.aboutHTML(C, M), services: T.servicesHTML(C, M),
          tools: "", contact: T.contactHTML(C), footer: T.footerHTML(C, "home") },
  works: { seo: seoHTML("works"), nav: T.navHTML(C, "works"), menu: T.menuHTML(C, "works"),
           workshead: T.worksHeadHTML(C), filters: T.filtersHTML(C), projects: T.projectsHTML(C, M, V),
           contact: T.contactHTML(C), footer: T.footerHTML(C, "works") },
};
const render = (page) => {
  let h = read(PAGES[page].file);
  for (const [k, v] of Object.entries(pageBlocks[page])) {
    const marker = `<!--BUILD:${k}-->`;
    if (!h.includes(marker)) fail(`${PAGES[page].file} no tiene el marcador ${marker}`);
    h = h.replace(marker, () => v);
  }
  h = h.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in vars)) fail(`Token {{${k}}} sin valor en build.js`); return vars[k]; });
  if (h.match(/\{\{|<!--BUILD:/)) fail(`Quedaron marcadores sin reemplazar en ${PAGES[page].file}`);
  return h;
};
const html = render("home"), worksHtml = render("works");
// cada link a trabajos.html#ancla tiene que llegar a algo que exista en esa página
for (const [, a] of html.matchAll(/href="trabajos\.html#([\w-]+)"/g)) if (!worksHtml.includes(`id="${a}"`)) fail(`index.html enlaza trabajos.html#${a}, que no existe`);
for (const [, a] of worksHtml.matchAll(/href="index\.html#([\w-]+)"/g)) if (!html.includes(`id="${a}"`)) fail(`trabajos.html enlaza index.html#${a}, que no existe`);

/* ---- 3) dist/ ---- */
fs.rmSync(DIST, { recursive: true, force: true });
for (const d of ["css", "js", "img", "video", "brand"]) fs.mkdirSync(path.join(DIST, "assets", d), { recursive: true });
fs.writeFileSync(path.join(DIST, "index.html"), html);
fs.writeFileSync(path.join(DIST, "trabajos.html"), worksHtml);
// el CSS publicado no lleva comentarios de desarrollo; la fuente los conserva
fs.writeFileSync(path.join(DIST, "assets", "css", "site.css"), css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n[ \t]*\n+/g, "\n"));
fs.writeFileSync(path.join(DIST, "assets", "js", "app.js"), js);
// imágenes: solo las variantes de las imágenes que alguna página usa
const keep = new Set([...usedImages].flatMap((id) => M[id].variants.map((v) => v.file)));
let imgBytes = 0;
for (const f of keep) { fs.copyFileSync(path.join(ROOT, "assets", "img", f), path.join(DIST, "assets", "img", f)); imgBytes += fs.statSync(path.join(ROOT, "assets", "img", f)).size; }
const unused = Object.keys(C.IMAGES).filter((id) => !usedImages.has(id));
if (unused.length) console.warn(`  ⚠ ${unused.length} imagen(es) declaradas en IMAGES que ninguna página usa (no se publican): ${unused.join(", ")}`);
for (const f of fs.readdirSync(path.join(ROOT, "assets", "brand"))) fs.copyFileSync(path.join(ROOT, "assets", "brand", f), path.join(DIST, "assets", "brand", f));
if (fs.existsSync(path.join(ROOT, "assets", "og.jpg"))) fs.copyFileSync(path.join(ROOT, "assets", "og.jpg"), path.join(DIST, "assets", "og.jpg"));
let videoBytes = 0;
for (const id of usedVideos) for (const f of [V[id].file, V[id].poster]) {
  fs.copyFileSync(path.join(ROOT, "assets", "video", f), path.join(DIST, "assets", "video", f));
  videoBytes += fs.statSync(path.join(ROOT, "assets", "video", f)).size;
}

// Cache: largo solo donde la URL cambia con el contenido (img y video con hash en el nombre; css/js con ?v=hash)
fs.writeFileSync(path.join(DIST, "_headers"),
`/assets/img/*
  Cache-Control: public, max-age=31536000, immutable
/assets/video/*
  Cache-Control: public, max-age=31536000, immutable
/assets/css/*
  Cache-Control: public, max-age=31536000, immutable
/assets/js/*
  Cache-Control: public, max-age=31536000, immutable
/assets/brand/*
  Cache-Control: public, max-age=86400
/assets/og.jpg
  Cache-Control: public, max-age=86400
/index.html
  Cache-Control: public, max-age=0, must-revalidate
/trabajos.html
  Cache-Control: public, max-age=0, must-revalidate
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin${REVISION ? "\n  X-Robots-Tag: noindex, nofollow" : ""}
`);
fs.writeFileSync(path.join(DIST, "robots.txt"), REVISION ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\n");

/* ---- 3b) todo lo que piden las páginas tiene que estar en dist/ ---- */
const missing = new Set();
for (const f of ["index.html", "trabajos.html", "assets/css/site.css", "assets/js/app.js"]) {
  for (const [ref] of fs.readFileSync(path.join(DIST, f), "utf8").matchAll(/assets\/[\w./-]+\.\w+/g)) {
    if (!fs.existsSync(path.join(DIST, ref))) missing.add(ref);
  }
}
if (missing.size) fail(`Las páginas piden ${missing.size} archivo(s) que no están en dist/:\n  ${[...missing].join("\n  ")}`);

/* ---- 4) resumen ---- */
function dirSize(d) { let n = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); n += e.isDirectory() ? dirSize(p) : fs.statSync(p).size; } return n; }
const heroCard = T.variantsOf(M, C.HERO.image).vs.filter((v) => v.role === "card").pop();
const first = Buffer.byteLength(html) + Buffer.byteLength(css) + Buffer.byteLength(js) + heroCard.bytes;
/* dos conteos de pendientes (para publicar, los dos en 0). «despu.{1,2}s» y no «despu[eé]s»: en la consola de Windows
   la é ocupa 2 bytes y el corchete NO la encuentra (da un falso cero). */
const pendOf = (h) => (h.replace(/<!--[\s\S]*?-->/g, "").match(/cambiar despu.{1,2}s/gi) || []).length;
const pendHome = pendOf(html), pendWorks = pendOf(worksHtml);
const pendSrc = ["content.js", "index.html", "trabajos.html", "scripts/templates.js"].reduce((n, f) => n + (read(f).match(/CAMBIAR DESPU.{1,2}S:/g) || []).length, 0);

console.log(`\n✓ Build listo — ${REVISION ? "MODO REVISIÓN (no indexable: para mostrar, no para publicar)" : "MODO PUBLICACIÓN (indexable)"}`);
console.log(`  ${C.PROJECTS.length} trabajos + ${C.CLIPS.length} videoclips · ${usedImages.size} imágenes (${(imgBytes / 1048576).toFixed(1)} MB) · ${usedVideos.size} videos (${(videoBytes / 1048576).toFixed(1)} MB) · dist/ = ${(dirSize(DIST) / 1048576).toFixed(1)} MB`);
console.log(`  Primer pantallazo (HTML + CSS + JS + portada ${heroCard.w}w): ${kb(first)}  (sin tipografías)`);
if (C.HERO.video) console.log(`  + reel de portada: ${kb(V[C.HERO.video].bytes)} (lo arranca app.js después del load; no con movimiento reducido ni ahorro de datos)`);
console.log(`  Pendientes visibles en las páginas («cambiar después»): ${pendHome + pendWorks}  (principal ${pendHome} · trabajos ${pendWorks})`);
console.log(`  Marcadores en el código («CAMBIAR DESPUÉS:»):          ${pendSrc}`);
console.log(`  → para PUBLICAR los dos tienen que dar 0 (detalle: _analisis/pendientes.md)`);
if (!SITE_URL) console.log(`  ⚠ Sin SITE_URL: no se emitieron canonical, og:url, og:image ni JSON-LD`);
if (!fs.existsSync(path.join(ROOT, "assets", "og.jpg"))) console.log(`  ⚠ Falta assets/og.jpg (imagen para compartir, 1200×630): npm run og`);
console.log("");
