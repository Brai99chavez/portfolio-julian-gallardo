/* =============================================================
   zip-dist.js — empaqueta dist/ en un .zip listo para arrastrar a Netlify
   -------------------------------------------------------------
   Uso:   npm run zip          →  julian-gallardo-sitio.zip  (en la carpeta del proyecto)

   Por qué un script propio y no «Comprimir en archivo ZIP»:
     · las rutas internas llevan SIEMPRE «/» (el comprimir de Windows PowerShell 5.1 las guarda con «\»;
       Netlify corre en Linux y las puede leer como un archivo llamado «assets\\img\\foto.webp»);
     · index.html queda en la RAÍZ del zip (no dentro de una carpeta «dist/»), que es lo que espera Netlify;
     · sin dependencias: formato ZIP escrito a mano (deflate para texto; las .webp ya vienen comprimidas, van sin recomprimir).
   Imprime en qué modo quedó dist/ (revisión o publicación) para no subir el equivocado.
   ============================================================= */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "julian-gallardo-sitio.zip");

if (!fs.existsSync(path.join(DIST, "index.html"))) { console.error("\n✗ No hay dist/index.html — corré antes: npm run build:revision (o npm run build)\n"); process.exit(1); }

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p) : files.push(p);
  }
})(DIST);

const dosTime = (d) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
const dosDate = (d) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
const STORE_EXT = /\.(webp|jpe?g|png|gif|woff2?|mp4|webm|zip)$/i;   // ya comprimidos: recomprimirlos no ahorra nada

const chunks = [];
const central = [];
let offset = 0;
for (const file of files) {
  const rel = path.relative(DIST, file).split(path.sep).join("/");           // SIEMPRE barras «/»
  const name = Buffer.from(rel, "utf8");
  const raw = fs.readFileSync(file);
  const crc = zlib.crc32(raw) >>> 0;
  const method = STORE_EXT.test(rel) ? 0 : 8;
  const data = method === 8 ? zlib.deflateRawSync(raw, { level: 9 }) : raw;
  const m = fs.statSync(file).mtime;

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);   // 0x0800 = nombres en UTF-8
  lh.writeUInt16LE(method, 8); lh.writeUInt16LE(dosTime(m), 10); lh.writeUInt16LE(dosDate(m), 12);
  lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22);
  lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  chunks.push(lh, name, data);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
  ch.writeUInt16LE(method, 10); ch.writeUInt16LE(dosTime(m), 12); ch.writeUInt16LE(dosDate(m), 14);
  ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24);
  ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
  ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
  central.push(ch, name);
  offset += lh.length + name.length + data.length;
}
const cdSize = central.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);

fs.writeFileSync(OUT, Buffer.concat([...chunks, ...central, end]));

const robots = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8");
const modo = /Disallow:\s*\/\s*$/m.test(robots) ? "REVISIÓN (no indexable)" : "PUBLICACIÓN (indexable)";
console.log(`\n✓ ${path.basename(OUT)}  ·  ${files.length} archivos  ·  ${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB`);
console.log(`  Modo de dist/ dentro del zip: ${modo}`);
console.log(`  Ruta: ${OUT}\n`);
