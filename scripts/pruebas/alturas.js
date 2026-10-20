// Alto total de cada página en los 5 anchos de la regla, y desbordes por elemento
const puppeteer = require("puppeteer-core");
const { resolveBrowser } = require("../browser");   // chrome-headless-shell, NUNCA Edge
const BASE = process.argv[2] || "http://localhost:5181";
(async () => {
  const b = await puppeteer.launch({ ...resolveBrowser(), args: ["--no-sandbox"] });
  for (const page of ["/", "/trabajos.html"]) {
    for (const [w, h] of [[320, 568], [375, 812], [768, 1024], [1440, 900], [1920, 1080]]) {
      const p = await b.newPage();
      const mobile = w < 800;
      await p.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile });
      await p.goto(BASE + page, { waitUntil: "networkidle0" });
      const r = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth, out = [];
        for (const el of document.querySelectorAll("body *")) {
          const rc = el.getBoundingClientRect();
          if (!rc.width || el.closest(".strip, .sheet, .filmstrip, .filters, .pencil, dialog, .hero__light, .contact__light, .beams, .footer__big, .svc-preview, .sr-only")) continue;
          const cs = getComputedStyle(el);
          if (rc.right > vw + 1) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} se sale ${Math.round(rc.right - vw)}px`);
          else if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && cs.overflowX === "visible" && !["IMG", "VIDEO", "svg", "path"].includes(el.tagName))
            out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} contenido ${el.scrollWidth} > caja ${el.clientWidth}`);
        }
        return { H: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, vw, out };
      });
      console.log(`${page.padEnd(15)} ${String(w).padStart(4)}px: alto ${String(r.H).padStart(6)} · scrollWidth ${r.sw}/${r.vw}${r.out.length ? "\n    " + r.out.slice(0, 8).join("\n    ") : ""}`);
      await p.close();
    }
  }
  await b.close();
})();
