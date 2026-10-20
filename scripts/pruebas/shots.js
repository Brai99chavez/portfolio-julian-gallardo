// Capturas por tramos (alto de pantalla) de una página a un ancho dado. Uso: node shots.js <url> <ancho> <alto> <prefijo> [maxTramos] [--reduce] [--nojs]
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");
const { resolveBrowser } = require("../browser");   // chrome-headless-shell, NUNCA Edge
const [url, w, h, prefix, maxT = "40"] = process.argv.slice(2);
const flags = process.argv.slice(2);
const OUT = path.join(require("os").tmpdir(), "julian-shots");   // capturas fuera del proyecto
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await puppeteer.launch({ ...resolveBrowser(), args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
  const p = await b.newPage();
  const mobile = +w < 800;
  await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  if (flags.includes("--reduce")) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  if (flags.includes("--nojs")) await p.setJavaScriptEnabled(false);
  const errs = [], bad = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  p.on("response", (r) => { if (r.status() >= 400) bad.push(r.status() + " " + r.url()); });
  await p.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2600));   // que terminen las animaciones de entrada
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const n = Math.min(+maxT, Math.ceil(H / +h));
  for (let i = 0; i < n; i++) {
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), i * +h);
    await new Promise((r) => setTimeout(r, 900));
    await p.screenshot({ path: path.join(OUT, `${prefix}-${String(i).padStart(2, "0")}.jpg`), type: "jpeg", quality: 72 });
  }
  const overflow = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth, out = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).visibility === "hidden") continue;
      if (el.closest(".strip, .sheet, .filmstrip, .filters, .pencil, dialog, .hero__light, .contact__light, .beams, .footer__big, .svc-preview")) continue;
      if (r.right > vw + 1 || (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible" && el.clientWidth > 0 && !["IMG","VIDEO","svg"].includes(el.tagName)))
        out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} right=${Math.round(r.right)} sw=${el.scrollWidth} cw=${el.clientWidth}`);
    }
    return { docW: document.documentElement.scrollWidth, vw, out: out.slice(0, 15) };
  });
  console.log(`${prefix}: alto ${H}px, ${n} tramos · scrollWidth ${overflow.docW}/${overflow.vw}`);
  if (overflow.out.length) console.log("  desbordes:\n   " + overflow.out.join("\n   "));
  if (errs.length) console.log("  errores:\n   " + errs.join("\n   "));
  if (bad.length) console.log("  respuestas >= 400:\n   " + bad.join("\n   "));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
