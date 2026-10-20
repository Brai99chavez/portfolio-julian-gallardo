/* =============================================================
   youtube-frames.js — baja los fotogramas de los videoclips que se usan de tapa
   -------------------------------------------------------------
   Uso:   npm run youtube        (después: npm run optimize)

   Las miniaturas oficiales de YouTube tienen casi todas el título del tema encima: son piezas gráficas, y en los
   portfolios no se muestran flyers ni piezas con texto. YouTube además guarda tres FOTOGRAMAS del propio video,
   tomados al 25, 50 y 75 % (maxres1/2/3.jpg, 1280×720): son cuadros del trabajo de Julián, sin texto agregado.
   Cada videoclip de CLIPS (content.js) dice cuál usa (frame: 1, 2 o 3).

   Se guardan en _fuentes/youtube/<id>-<n>.jpg (no se publican: el optimizador genera los .webp del sitio).
   Si el archivo ya está, no lo vuelve a bajar.
   ============================================================= */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const { CLIPS = [] } = require(path.join(ROOT, "content.js"));
const OUT = path.join(ROOT, "_fuentes", "youtube");

const get = (url) => new Promise((res, rej) => {
  https.get(url, (r) => {
    if (r.statusCode !== 200) { r.resume(); return rej(new Error(`${r.statusCode} ${url}`)); }
    const parts = []; r.on("data", (d) => parts.push(d)); r.on("end", () => res(Buffer.concat(parts)));
  }).on("error", rej);
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let nuevos = 0, ya = 0;
  // los tres fotogramas de cada video: el de tapa (frame) y los otros dos, que pasan al pasar el mouse (content.js → flips)
  for (const c of CLIPS) {
    if (!c.yt) continue;
    for (const n of [1, 2, 3]) {
      const file = path.join(OUT, `${c.yt}-${n}.jpg`);
      if (fs.existsSync(file)) { ya++; continue; }
      const buf = await get(`https://i.ytimg.com/vi/${c.yt}/maxres${n}.jpg`);
      fs.writeFileSync(file, buf);
      nuevos++;
      console.log(`  ✓ ${c.yt}-${n}.jpg  ${(buf.length / 1024).toFixed(0)} KB  (${c.artist} — ${c.title})`);
    }
  }
  console.log(`\n✓ Fotogramas de YouTube: ${nuevos} bajados, ${ya} ya estaban (en _fuentes/youtube/)\n`);
})().catch((e) => { console.error("\n✗ " + e.message + "\n"); process.exit(1); });
