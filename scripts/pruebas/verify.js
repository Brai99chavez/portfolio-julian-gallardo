// Batería de pruebas del portfolio de Julián (chrome-headless-shell, NUNCA Edge).
// Uso: node verify.js [base] [--plant=404|overflow|contrast|focus]   (plantar = romper algo a propósito para ver que la prueba lo agarra)
const puppeteer = require("puppeteer-core");
const { resolveBrowser } = require("../browser");   // chrome-headless-shell, NUNCA Edge
const BASE = (process.argv.find((a) => a.startsWith("http")) || "http://localhost:5181").replace(/\/$/, "");
const PLANT = (process.argv.find((a) => a.startsWith("--plant=")) || "").split("=")[1] || "";
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "";
const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "  ✓" : "  ✗"} ${name}${detail ? " — " + detail : ""}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const WIDTHS = [[320, 568], [375, 812], [768, 1024], [1440, 900], [1920, 1080]];

async function newPage(b, w, h, { dpr = 1, reduce = false, js = true, block = [] } = {}) {
  const p = await b.newPage();
  const mobile = w < 800;
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  if (reduce) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  if (!js) await p.setJavaScriptEnabled(false);
  p._errs = []; p._bad = []; p._req = [];
  p.on("pageerror", (e) => p._errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/youtube|ERR_BLOCKED|net::ERR_FAILED/.test(m.text())) p._errs.push(m.text()); });
  p.on("response", (r) => { if (r.status() >= 400 && !/youtube|ytimg|google/.test(r.url())) p._bad.push(r.status() + " " + r.url()); });
  await p.setRequestInterception(true);
  p.on("request", (r) => {
    p._req.push({ url: r.url(), t: Date.now() });
    if (/youtube|ytimg|googlevideo|doubleclick/.test(r.url())) return r.abort();   // no salir a YouTube en las pruebas
    if (block.some((s) => r.url().includes(s))) return r.abort();
    r.continue();
  });
  return p;
}
const plant = async (p) => {
  if (PLANT === "404") await p.evaluate(() => { const i = document.createElement("img"); i.src = "assets/img/no-existe.webp"; i.alt = "foto plantada para probar la prueba"; document.querySelector("main").appendChild(i); });
  if (PLANT === "overflow") await p.evaluate(() => { const d = document.createElement("div"); d.style.cssText = "width:120vw;height:10px"; d.className = "plantado"; document.querySelector(".hero__text, .works-head .wrap").appendChild(d); });
  if (PLANT === "contrast") await p.evaluate(() => { const s = document.querySelector(".hero__lead, .head__lead"); s.style.color = "#3a302c"; });
  if (PLANT === "focus") await p.evaluate(() => { const st = document.createElement("style"); st.textContent = ".nav__links a{outline:none!important}"; document.head.appendChild(st); });
};

/* recorre la página de a tramos para que carguen las lazy y se revelen las fotos */
async function scrollAll(p, step = 0.8, pause = 260) {
  const vh = await p.evaluate(() => innerHeight);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= H; y += vh * step) { await p.evaluate((yy) => scrollTo({ top: yy, behavior: "instant" }), y); await wait(pause); }
  await wait(1600);
}

// lee «rgb(…)» (0–255) y también «color(srgb …)» (0–1), que es lo que devuelve el navegador para un color-mix()
const rgbOf = (c) => { const m = c.match(/[\d.]+/g).map(Number); return /^color\(srgb/.test(c) ? m.slice(0, 3).map((v) => v * 255) : m.slice(0, 3); };
const lum = (c) => { const m = rgbOf(c); const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };

(async () => {
  const b = await puppeteer.launch({ ...resolveBrowser(), args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });

  /* 1) cada página × 5 anchos: errores, 404, desbordes, fotos rotas, todo revelado al final */
  if (!only || only === "anchos") for (const page of ["/", "/trabajos.html"]) for (const [w, h] of WIDTHS) {
    const p = await newPage(b, w, h);
    await p.goto(BASE + page, { waitUntil: "networkidle0" });
    await plant(p);
    await scrollAll(p);
    const r = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth, over = [];
      for (const el of document.querySelectorAll("body *")) {
        const rc = el.getBoundingClientRect();
        if (!rc.width || el.closest(".strip, .sheet, .filmstrip, .filters, .pencil, dialog, .hero__light, .contact__light, .beams, .footer__big, .svc-preview, .sr-only")) continue;
        if (rc.right > vw + 1 || rc.left < -1) over.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`);
      }
      // las fotos de un «Ver las N fotos más» cerrado no se dibujan ni se bajan (a propósito): se prueban aparte, abriéndolo
      const imgs = [...document.querySelectorAll("img")].filter((i) => !i.closest("dialog") && !i.closest("details:not([open])"));
      const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src"));
      const notLoaded = imgs.filter((i) => !i.complete).length;
      const devs = [...document.querySelectorAll("[data-develop]")].filter((d) => !d.closest("details:not([open])"));
      const undeveloped = devs.filter((d) => !d.classList.contains("is-dev")).length;
      // las fotos que rotan en la portada tienen su fundido cada 4 s: se prueban aparte (sección «rotacion»)
      const running = [...document.querySelectorAll("img")].filter((i) => !i.closest(".print--rotate")).flatMap((i) => i.getAnimations()).filter((a) => a.playState === "running").length;
      const filtered = imgs.filter((i) => { const f = getComputedStyle(i).filter; return f && f !== "none"; }).length;
      // ocultas a propósito: los fotogramas que pasan al pasar el mouse, los pósters debajo de un video, la vista previa de «qué hago»
      // y las fotos de la portada que esperan su turno (la que está a la vista, .is-on, sí cuenta)
      const hiddenImgs = imgs.filter((i) => +getComputedStyle(i).opacity < .9 && !i.closest(".flip, .svc-preview") && !/clip__f--[12]/.test(i.className) && !i.classList.contains("reel__poster") && !i.classList.contains("pick__img") && !i.classList.contains("contact__logo")
        && !(i.closest(".print--rotate") && !i.classList.contains("is-on"))).length;
      // alt vacío a propósito: decorativas o que acompañan a un texto (la tarjeta lleva el título; la miniatura de «qué hago», el sello)
      const altBad = imgs.filter((i) => { const a = i.getAttribute("alt"); if (a === null) return true; if (a === "") return !i.closest(".pick__media, .reel--strip, .nav__brand, .footer, .svc-preview, .menu") && !/svc__thumb|contact__stamp|clip__f--[12]/.test(i.className); return a.length < 12; }).map((i) => i.getAttribute("src"));
      return { over: [...new Set(over)].slice(0, 6), broken, notLoaded, undeveloped, running, filtered, hiddenImgs, altBad, h1: document.querySelectorAll("h1").length, lang: document.documentElement.lang };
    });
    const tag = `${page} ${w}px`;
    ok(`${tag}: sin errores de consola`, !p._errs.length, p._errs.slice(0, 3).join(" | "));
    ok(`${tag}: cero respuestas 404`, !p._bad.length, p._bad.slice(0, 3).join(" | "));
    ok(`${tag}: nada se sale de la ventana`, !r.over.length, r.over.join(", "));
    ok(`${tag}: fotos sin romper`, !r.broken.length, r.broken.join(", "));
    ok(`${tag}: todas reveladas y sin filtro al final`, r.undeveloped === 0 && r.running === 0 && r.filtered === 0 && r.hiddenImgs === 0, `sin revelar ${r.undeveloped} · animando ${r.running} · con filtro ${r.filtered} · ocultas ${r.hiddenImgs}`);
    ok(`${tag}: alt en todas las imágenes de contenido`, !r.altBad.length, r.altBad.slice(0, 3).join(", "));
    ok(`${tag}: un solo h1 y lang`, r.h1 === 1 && r.lang === "es-AR", `h1=${r.h1} lang=${r.lang}`);
    await p.close();
  }

  /* 1b) todas las fotos: cada serie con su «Ver las N fotos más»; cerrados no bajan nada; abiertos, todas cargan y se revelan */
  if (!only || only === "todas") for (const [w, h] of [[375, 812], [1440, 900]]) {
    const p = await newPage(b, w, h);
    await p.goto(BASE + "/trabajos.html", { waitUntil: "networkidle0" });
    const before = await p.evaluate(() => ({ frames: document.querySelectorAll(".project--photo .frame").length, details: document.querySelectorAll(".sheet-more").length }));
    const reqLite = p._req.length;
    await scrollAll(p, 1, 120);
    const closedLoads = await p.evaluate(() => [...document.querySelectorAll("details:not([open]) img")].filter((i) => i.complete && i.naturalWidth > 0).length);
    ok(`${w}px: las ${before.frames} fotos de las series están en la página (${before.details} desplegables)`, before.frames === 340, `${before.frames} fotos`);
    ok(`${w}px: con los desplegables cerrados no se baja ninguna de sus fotos`, closedLoads === 0, `${closedLoads} bajadas`);
    await p.evaluate(() => document.querySelectorAll(".sheet-more").forEach((d) => (d.open = true)));
    await scrollAll(p, 0.9, 160);
    await wait(1500);
    const r = await p.evaluate(() => {
      const imgs = [...document.querySelectorAll(".sheet-more img")];
      return { n: imgs.length, broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src")).slice(0, 3),
               pending: imgs.filter((i) => !i.complete).length, undeveloped: [...document.querySelectorAll(".sheet-more [data-develop]")].filter((d) => !d.classList.contains("is-dev")).length };
    });
    ok(`${w}px: abiertos, las ${r.n} fotos del desplegable cargan y se revelan`, !r.broken.length && r.pending === 0 && r.undeveloped === 0, `rotas ${r.broken.join(", ")} · sin cargar ${r.pending} · sin revelar ${r.undeveloped}`);
    // el visor recorre la serie entera (elegidas + desplegable)
    await p.evaluate(() => document.querySelector("#en-vivo .frame__link").click()); await wait(400);
    const cap = await p.$eval(".lb__cap", (e) => e.textContent);
    ok(`${w}px: el visor cuenta la serie entera («${cap}»)`, /\/128$/.test(cap), cap);
    await p.close();
  }

  /* 2) sin JS, con app.js bloqueado y con movimiento reducido: nada queda oculto */
  if (!only || only === "sinjs") for (const page of ["/", "/trabajos.html"]) {
    const visibleCheck = () => {
      const bad = [];
      // de la portada, la foto a la vista (.is-on): las otras que rotan esperan ocultas a propósito
      for (const el of document.querySelectorAll("[data-reveal], .hero__line, .hero__lead, .hero__cta, [data-develop] img, .print--hero img.is-on, .tool__ico path")) {
        const cs = getComputedStyle(el);
        if (+cs.opacity < .99 || (cs.strokeDashoffset && el.tagName === "path" && parseFloat(cs.strokeDashoffset) > .01)) bad.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} op=${cs.opacity}`);
      }
      return bad;
    };
    for (const mode of ["sin JS", "app.js bloqueado", "movimiento reducido"]) {
      const p = await newPage(b, 375, 812, { js: mode !== "sin JS", reduce: mode === "movimiento reducido", block: mode === "app.js bloqueado" ? ["app.js"] : [] });
      await p.goto(BASE + page, { waitUntil: "networkidle0" });
      if (mode === "app.js bloqueado") {
        const early = await p.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((e) => +getComputedStyle(e).opacity < .5).length);
        ok(`${page} ${mode}: antes de la red de seguridad, lo animado espera oculto (la prueba ve el estado previo)`, early > 0, `${early} elementos ocultos`);
        await wait(4800);
      }
      if (mode === "movimiento reducido") { const t0 = await p.evaluate(() => getComputedStyle(document.querySelector(".hero__line, .works__title")).opacity); ok(`${page} reducido: el título se ve desde el primer instante`, +t0 > .99, `opacity ${t0}`); }
      await scrollAll(p, 0.9, 120);
      const bad = await p.evaluate(visibleCheck);
      ok(`${page} ${mode}: todo visible`, !bad.length, bad.slice(0, 4).join(" | "));
      if (mode === "movimiento reducido") {
        const mp4 = p._req.filter((r) => /\.mp4/.test(r.url)).length;
        ok(`${page} reducido: no se baja ningún video solo`, mp4 === 0, `${mp4} pedidos de .mp4`);
      }
      if (mode === "sin JS") {
        const btns = await p.evaluate(() => [...document.querySelectorAll(".nav__menu, .copy, .reel__pause, .toggle, #filterbar")].filter((e) => !e.hidden && getComputedStyle(e).display !== "none").length);
        ok(`${page} sin JS: no hay botones que no hagan nada (menú, copiar, pausa, filtro ocultos)`, btns === 0, `${btns} visibles`);
      }
      await p.close();
    }
  }

  /* 3) teclado: Tab desde arriba en una página nueva; el primero es el skip link y todo foco tiene outline */
  if (!only || only === "teclado") for (const page of ["/", "/trabajos.html"]) {
    const p = await newPage(b, 1440, 900);
    await p.goto(BASE + page, { waitUntil: "networkidle0" });
    await plant(p);
    const seen = [];
    for (let i = 0; i < 40; i++) {
      await p.keyboard.press("Tab");
      seen.push(await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { tag: a.tagName, cls: a.className && a.className.baseVal === undefined ? a.className : "", text: (a.textContent || "").trim().slice(0, 24), outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2 }; }));
    }
    ok(`${page} teclado: el primer Tab es «Saltar al contenido»`, /skip/.test(seen[0].cls), `${seen[0].tag}.${seen[0].cls}`);
    const noOutline = seen.filter((s) => !s.outline && s.tag !== "BODY");
    ok(`${page} teclado: los 40 primeros focos tienen outline visible`, !noOutline.length, noOutline.slice(0, 3).map((s) => `${s.tag}.${s.cls} «${s.text}»`).join(" | "));
    await p.close();
  }

  /* 4) contraste calculado: texto contra su fondo real (subiendo hasta el primer fondo opaco) y borde de controles */
  if (!only || only === "contraste") for (const page of ["/", "/trabajos.html"]) for (const [w, h] of [[375, 812], [1440, 900]]) {
    const p = await newPage(b, w, h);
    await p.goto(BASE + page, { waitUntil: "networkidle0" });
    await plant(p);
    await scrollAll(p, 0.9, 120);
    const items = await p.evaluate(() => {
      const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const a = c.match(/[\d.]+/g); if (a && (a.length < 4 || +a[3] > .85)) return c; } return "rgb(21,16,15)"; };
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const done = new Set();
      while (walker.nextNode()) {
        const t = walker.currentNode; const el = t.parentElement;
        if (!t.textContent.trim() || done.has(el) || el.closest("dialog, .sr-only, [aria-hidden=true], .skip, .pick__media, .clip__media, .reel, script, style, noscript, .strip")) continue;
        done.add(el);
        const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        out.push({ sel: `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`, text: t.textContent.trim().slice(0, 30), fg: cs.color, bg: bgOf(el), large: size >= 24 || (bold && size >= 18.66), op: +cs.opacity });
      }
      const ctrls = [...document.querySelectorAll(".btn, .chip, .toggle, .nav__menu, .copy:not([hidden]), .ig__go, .roles li, .tool__ico, .chan--split")].filter((e) => e.getBoundingClientRect().width).map((e) => {
        const cs = getComputedStyle(e); return { sel: `${e.tagName.toLowerCase()}.${[...e.classList].join(".")}`, border: cs.borderTopColor, bw: parseFloat(cs.borderTopWidth), fill: cs.backgroundColor, bg: bgOf(e.parentElement) };
      });
      return { out, ctrls };
    });
    const bad = [];
    for (const it of items.out) {
      const c = (Math.max(lum(it.fg), lum(it.bg)) + .05) / (Math.min(lum(it.fg), lum(it.bg)) + .05);
      const need = it.large ? 3 : 4.5;
      if (c < need) bad.push(`${it.sel} «${it.text}» ${c.toFixed(2)}:1 (pide ${need})`);
    }
    const badC = [];
    for (const c of items.ctrls) {
      if (!c.bw) continue;
      const a = c.border.match(/[\d.]+/g); if (a && a.length === 4 && +a[3] < .99) { badC.push(`${c.sel} borde translúcido`); continue; }
      const fillA = c.fill.match(/[\d.]+/g); const opaqueFill = fillA && (fillA.length < 4 || +fillA[3] > .85);
      const k = (Math.max(lum(c.border), lum(c.bg)) + .05) / (Math.min(lum(c.border), lum(c.bg)) + .05);
      const kf = opaqueFill ? (Math.max(lum(c.fill), lum(c.bg)) + .05) / (Math.min(lum(c.fill), lum(c.bg)) + .05) : 0;
      if (k < 3 && kf < 3) badC.push(`${c.sel} borde ${k.toFixed(2)}:1`);
    }
    ok(`${page} ${w}px contraste de texto (${items.out.length} textos)`, !bad.length, bad.slice(0, 5).join(" | "));
    ok(`${page} ${w}px borde de controles ≥ 3:1 (${items.ctrls.length})`, !badC.length, [...new Set(badC)].slice(0, 5).join(" | "));
    await p.close();
  }

  /* 5) links: anclas internas existen; externos con formato válido; target=_blank con noopener */
  if (!only || only === "links") for (const page of ["/", "/trabajos.html"]) {
    const p = await newPage(b, 1440, 900);
    await p.goto(BASE + page, { waitUntil: "networkidle0" });
    const r = await p.evaluate(async () => {
      const bad = [], ext = new Set();
      for (const a of document.querySelectorAll("a[href]")) {
        const h = a.getAttribute("href");
        if (a.target === "_blank" && !/noopener/.test(a.rel)) bad.push("sin noopener: " + h);
        if (h.startsWith("#")) { if (h.length > 1 && !document.getElementById(h.slice(1))) bad.push("ancla rota: " + h); continue; }
        if (/^https?:/.test(h)) { ext.add(h); if (!/^https:\/\/(www\.)?(instagram\.com\/(jottavisuals|jotta\.gallardo|reels?\/[\w-]+)\/|youtube\.com\/watch\?v=[\w-]{11}$|linkedin\.com\/in\/julian-gallardo-910a31215\/$|wa\.me\/5492213144443$)/.test(h)) bad.push("externo raro: " + h); continue; }
        if (h.startsWith("mailto:")) { if (h !== "mailto:juliangallardo249@gmail.com") bad.push("mail raro: " + h); continue; }
        const [file, anchor] = h.split("#");
        const res = await fetch(file, { method: "HEAD" }); if (!res.ok) bad.push(`${res.status} ${file}`);
        if (anchor && file && file !== location.pathname.split("/").pop()) { const txt = await (await fetch(file)).text(); if (!txt.includes(`id="${anchor}"`)) bad.push("ancla rota en otra página: " + h); }
      }
      return { bad, ext: ext.size };
    });
    ok(`${page} links (${r.ext} externos)`, !r.bad.length, r.bad.slice(0, 5).join(" | "));
    await p.close();
  }

  /* 6) menú del celular, filtro, visor, videoclips y reproductor */
  if (!only || only === "interaccion") {
    let p = await newPage(b, 375, 812);
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    const vis = await p.$eval(".nav__menu", (e) => !e.hidden);
    ok("menú: el botón aparece con JS", vis);
    const fits = await p.evaluate(() => { const r = [...document.querySelectorAll(".nav__brand, .nav__links .btn, .nav__menu")].map((e) => e.getBoundingClientRect()); return r.every((x, i) => i === 0 || x.left >= r[i - 1].right - 1) && r[2].right <= innerWidth; });
    ok("menú: nombre, «Escribime» y el botón entran sin pisarse en 375", fits);
    await p.tap(".nav__menu");
    await wait(300);
    const st = await p.evaluate(() => ({ open: document.getElementById("menu").open, exp: document.querySelector(".nav__menu").getAttribute("aria-expanded"), inside: document.getElementById("menu").contains(document.activeElement) }));
    ok("menú: abre, aria-expanded=true y el foco queda adentro", st.open && st.exp === "true" && st.inside, JSON.stringify(st));
    await p.keyboard.press("Escape"); await wait(200);
    ok("menú: Esc lo cierra", !(await p.$eval("#menu", (m) => m.open)));
    await p.tap(".nav__menu"); await wait(250);
    await p.evaluate(() => [...document.querySelectorAll(".menu__list a")].find((a) => a.getAttribute("href") === "#sobre").click());
    await wait(1200);
    const at = await p.evaluate(() => ({ top: Math.round(document.getElementById("sobre").getBoundingClientRect().top), focus: document.activeElement.id }));
    ok("menú: «Sobre mí» lleva a la sección y le deja el foco", Math.abs(at.top - 76) < 40 && at.focus === "sobre", JSON.stringify(at));
    await p.close();
    // 320: que entre todo
    p = await newPage(b, 320, 568);
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    const fits320 = await p.evaluate(() => { const r = [...document.querySelectorAll(".nav__brand, .nav__links .btn, .nav__menu")].map((e) => e.getBoundingClientRect()); return { ok: r.every((x, i) => i === 0 || x.left >= r[i - 1].right - 1) && r[2].right <= innerWidth, w: r.map((x) => Math.round(x.right)) }; });
    ok("barra en 320: nombre, «Escribime» y menú entran", fits320.ok, JSON.stringify(fits320.w));
    await p.close();

    // filtro
    p = await newPage(b, 1440, 900);
    await p.goto(BASE + "/trabajos.html", { waitUntil: "networkidle0" });
    await p.click('[data-filter="foto"]'); await wait(300);
    let f = await p.evaluate(() => ({ url: location.search, shown: [...document.querySelectorAll(".project")].filter((x) => !x.hidden).map((x) => x.dataset.cat), status: document.getElementById("filtersStatus").textContent }));
    ok("filtro: «Fotografía» deja solo fotos y pone ?cat=foto", f.url === "?cat=foto" && f.shown.length > 0 && f.shown.every((c) => c === "foto"), `${f.url} · ${f.shown.join(",")} · «${f.status}»`);
    await p.goto(BASE + "/trabajos.html?cat=videoclips", { waitUntil: "networkidle0" });
    f = await p.evaluate(() => [...document.querySelectorAll(".project")].filter((x) => !x.hidden).map((x) => x.id));
    ok("filtro: ?cat=videoclips al cargar", f.length === 1 && f[0] === "videoclips", f.join(","));
    await p.goto(BASE + "/trabajos.html?cat=videoclips#aryes", { waitUntil: "networkidle0" }); await wait(500);
    f = await p.evaluate(() => ({ hidden: document.getElementById("aryes").hidden, top: Math.round(document.getElementById("aryes").getBoundingClientRect().top) }));
    ok("filtro: un link a un trabajo oculto (#aryes) muestra todo y lleva hasta él", !f.hidden && f.top < 300, JSON.stringify(f));

    // visor
    await p.goto(BASE + "/trabajos.html#en-vivo", { waitUntil: "networkidle0" }); await wait(600);
    await p.click("#en-vivo .frame__link"); await wait(500);
    let lb = await p.evaluate(() => ({ open: document.getElementById("lb").open, src: document.querySelector(".lb__img").getAttribute("src"), cap: document.querySelector(".lb__cap").textContent, alt: document.querySelector(".lb__img").alt.length }));
    ok("visor: abre la foto grande con epígrafe y alt", lb.open && /assets\/img\//.test(lb.src) && lb.cap.length > 3 && lb.alt > 12, JSON.stringify(lb));
    await p.click(".lb__zoomin"); await wait(600);
    lb = await p.evaluate(() => ({ pct: document.querySelector(".lb__pct").textContent, zoomed: document.getElementById("lb").classList.contains("is-zoomed"), src: document.querySelector(".lb__img").getAttribute("src") }));
    ok("visor: «+» acerca y baja la versión zoom", lb.zoomed && lb.pct === "1,5×" && /zoom|2880|2160|-\d{4}w-/.test(lb.src), JSON.stringify(lb));
    // arrastrar hasta el borde: los dos bordes quedan pegados a la ventana (igualdad, no desigualdad)
    const g = await p.evaluate(() => { const i = document.querySelector(".lb__img").getBoundingClientRect(); return { cx: i.left + i.width / 2, cy: i.top + i.height / 2 }; });
    await p.mouse.move(g.cx, g.cy); await p.mouse.down(); await p.mouse.move(g.cx + 2000, g.cy + 2000, { steps: 12 }); await p.mouse.up(); await wait(300);
    const edge = await p.evaluate(() => { const r = document.querySelector(".lb__img").getBoundingClientRect(); const L = document.getElementById("lb"); return { left: Math.round(r.left), top: Math.round(r.top), wider: r.width > L.clientWidth, taller: r.height > L.clientHeight }; });
    ok("visor: arrastrado al tope, la foto queda pegada al borde (sin hueco)", (!edge.wider || Math.abs(edge.left) <= 1) && (!edge.taller || Math.abs(edge.top) <= 1), JSON.stringify(edge));
    await p.keyboard.press("ArrowRight"); await p.keyboard.press("0"); await wait(200);
    await p.keyboard.press("ArrowRight"); await wait(300);
    lb = await p.evaluate(() => ({ cap: document.querySelector(".lb__cap").textContent, zoomed: document.getElementById("lb").classList.contains("is-zoomed") }));
    ok("visor: «0» ajusta y → pasa a la siguiente sin zoom", /2\/\d+/.test(lb.cap) && !lb.zoomed, JSON.stringify(lb));
    await p.keyboard.press("Escape"); await wait(200);
    ok("visor: Esc cierra", !(await p.$eval("#lb", (d) => d.open)));

    // videoclips (YouTube sin cookies; en la prueba no se sale a YouTube: la request se corta)
    await p.goto(BASE + "/trabajos.html#videoclips", { waitUntil: "networkidle0" });
    const before = p._req.filter((r) => /youtube/.test(r.url)).length;
    ok("videoclips: no se pide nada a YouTube antes de tocar uno", before === 0, `${before} pedidos`);
    await p.click(".clip__link"); await wait(400);
    let yt = await p.evaluate(() => ({ open: document.getElementById("yt").open, src: (document.querySelector(".yt__frame iframe") || {}).src || "", out: document.querySelector(".yt__out").href, cap: document.querySelector(".yt__t").textContent }));
    ok("videoclips: abre el reproductor sin cookies con el video correcto", yt.open && /youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1/.test(yt.src) && yt.out.includes(yt.src.match(/embed\/([\w-]{11})/)[1]) && yt.cap.length > 3, `${yt.src.slice(0, 70)} · «${yt.cap}»`);
    await p.keyboard.press("Escape"); await wait(200);
    yt = await p.evaluate(() => ({ open: document.getElementById("yt").open, iframes: document.querySelectorAll(".yt__frame iframe").length }));
    ok("videoclips: al cerrar se borra el iframe", !yt.open && yt.iframes === 0, JSON.stringify(yt));

    // reproductor del reel completo
    await p.goto(BASE + "/trabajos.html#aryes", { waitUntil: "networkidle0" }); await wait(300);
    await p.click("#aryes a[data-player]"); await wait(800);
    let pl = await p.evaluate(() => { const v = document.querySelector(".player__video"); return { open: document.getElementById("player").open, src: v.getAttribute("src"), paused: v.paused, muted: v.muted }; });
    ok("reel completo: abre el reproductor con sonido", pl.open && /aryes-reel-[0-9a-f]{8}\.mp4/.test(pl.src) && !pl.muted, JSON.stringify(pl));
    await p.keyboard.press("Escape"); await wait(300);
    pl = await p.evaluate(() => ({ open: document.getElementById("player").open, src: document.querySelector(".player__video").getAttribute("src") }));
    ok("reel completo: al cerrar corta la descarga (sin src)", !pl.open && !pl.src, JSON.stringify(pl));
    await p.close();

    // copiar el mail (solo con mouse)
    const ctx = b.defaultBrowserContext();
    await ctx.overridePermissions(BASE, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
    p = await newPage(b, 1440, 900);
    await p.goto(BASE + "/#contacto", { waitUntil: "networkidle0" }); await wait(500);
    for (const [sel, want, what] of [['.copy[data-copy*="@"]', "juliangallardo249@gmail.com", "el mail"], ['.copy[data-copy^="+54"]', "+54 9 221 314-4443", "el WhatsApp"]]) {
      await p.evaluate(() => navigator.clipboard.writeText("dato plantado"));
      await p.click(sel); await wait(300);
      const clip = await p.evaluate(async (s) => ({ txt: await navigator.clipboard.readText(), label: document.querySelector(s + " .copy__t").textContent, status: document.getElementById("copyStatus").textContent }), sel);
      ok(`copiar: el portapapeles tiene ${what}, el botón y el aviso lo confirman`, clip.txt === want && clip.label === "¡Copiado!" && /Copiado/.test(clip.status), JSON.stringify(clip));
      await wait(1900);
    }
    const wa = await p.$eval('a[href^="https://wa.me/"]', (a) => a.href);
    ok("WhatsApp: el link es wa.me/5492213144443 (549 + 221 + número)", wa === "https://wa.me/5492213144443", wa);
    await p.close();
    p = await newPage(b, 375, 812);
    await p.goto(BASE + "/#contacto", { waitUntil: "networkidle0" });
    const copyMobile = await p.$eval(".copy", (e) => getComputedStyle(e).display);
    ok("copiar: no aparece en el celular", copyMobile === "none", copyMobile);
    await p.close();
  }

  /* 7) videos y peso de la primera carga, medido en la red */
  if (!only || only === "red") for (const [w, h, dpr] of [[1440, 900, 1], [1440, 900, 2], [375, 812, 3]]) {
    const p = await newPage(b, w, h, { dpr });
    const cdp = await p.target().createCDPSession(); await cdp.send("Network.enable");
    const sizes = new Map(), urls = new Map(), done = [];
    cdp.on("Network.requestWillBeSent", (e) => urls.set(e.requestId, e.request.url));
    cdp.on("Network.loadingFinished", (e) => { sizes.set(e.requestId, e.encodedDataLength); done.push({ url: urls.get(e.requestId), t: Date.now() }); });
    let loadAt = 0;
    p.on("load", () => { loadAt = Date.now(); });
    await p.goto(BASE + "/", { waitUntil: "networkidle0" }); await wait(2500);
    // las fotos de portada se leen de la página (cambian con el contenido): la primera se ve al entrar; las demás rotan y,
    // como el reel, se bajan después del load: no cuentan en la primera carga (se informan aparte)
    const idOf = (u) => (u.match(/img\/([a-z0-9-]+?)-\d+w-/) || [])[1] || "—";
    const heroIds = (await p.evaluate(() => [...document.querySelectorAll(".print--hero img")].map((i) => i.dataset.src || i.getAttribute("src")))).map(idOf);
    const heroId = heroIds[0], rotIds = heroIds.slice(1);
    const isRot = (u) => rotIds.some((r) => u.includes("/img/" + r + "-"));
    let total = 0, mp4 = 0, fonts = 0, rot = 0;
    for (const [id, n] of sizes) { const u = urls.get(id) || ""; if (/fonts\.(googleapis|gstatic)/.test(u)) { fonts += n; continue; } if (isRot(u)) { rot += n; continue; } if (/\.mp4/.test(u)) mp4 += n; total += n; }
    const heroImgDone = done.find((d) => d.url && d.url.includes("/" + heroId + "-"));
    const firstMp4 = p._req.find((r) => /\.mp4/.test(r.url));
    const rotReqs = p._req.filter((r) => isRot(r.url));
    ok(`peso primera carga ${w}px @${dpr}x (sin tipografías)`, total - mp4 <= 1.1 * 1048576, `${(total / 1048576).toFixed(2)} MB en total · ${(mp4 / 1048576).toFixed(2)} MB de video · tipografías ${(fonts / 1024).toFixed(0)} KB · fotos que rotan (aparte) ${(rot / 1024).toFixed(0)} KB`);
    ok(`${w}px @${dpr}x: el reel de portada se pide después del load y de la foto`, !firstMp4 || (firstMp4.t >= loadAt - 5 && (!heroImgDone || firstMp4.t >= heroImgDone.t - 5)), firstMp4 ? `mp4 a ${firstMp4.t - loadAt} ms del load` : "no se pidió");
    if (rotIds.length) ok(`${w}px @${dpr}x: las otras fotos de portada se piden después del load`, rotReqs.every((r) => r.t >= loadAt - 5), rotReqs.length ? `a ${rotReqs.map((r) => r.t - loadAt).join(", ")} ms del load` : "todavía no se pidieron");
    // si la precarga y el <img> no piden el mismo ancho, el navegador baja la foto de portada dos veces
    const heroReqs = [...new Set([...urls.values()].filter((u) => u.includes("/img/" + heroId + "-")).map((u) => u.split("?")[0]))];
    const pre = await p.evaluate(() => ({ pre: document.querySelector('link[rel="preload"][as="image"]')?.getAttribute("imagesizes"), img: document.querySelector(".print--hero img").getAttribute("sizes") }));
    ok(`${w}px @${dpr}x: la portada se baja una sola vez (precarga = la que se usa)`, heroReqs.length === 1 && pre.pre === pre.img, `${heroReqs.map((u) => u.split("/").pop()).join(", ")} · preload «${pre.pre}» · img «${pre.img}»`);
    const bigs = [...urls.values()].filter((u) => /-(2200|2880|2160|1920|1440)w-/.test(u) && !heroIds.some((h) => u.includes("/img/" + h + "-")));
    ok(`${w}px @${dpr}x: no se bajan versiones grandes del visor sin abrirlo`, !bigs.length, bigs.slice(0, 3).join(", "));
    await p.close();
  }

  /* 7b) lo nuevo del v2: historias, «qué hago» con vista previa, fotogramas al pasar el mouse, seguidor y haces de luz */
  if (!only || only === "v2") {
    let p = await newPage(b, 1440, 900);
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    await p.evaluate(() => scrollTo({ top: document.getElementById("trabajo").offsetTop, behavior: "instant" })); await wait(900);
    let st = await p.evaluate(() => { const s = document.querySelector(".stories"); return { over: s.scrollWidth > s.clientWidth, prev: !document.querySelector(".stories__prev").hidden, next: !document.querySelector(".stories__next").hidden, prevDis: document.querySelector(".stories__prev").disabled, x: s.scrollLeft }; });
    ok("historias: desbordan y aparecen las flechas (la de atrás, deshabilitada al empezar)", st.over && st.prev && st.next && st.prevDis && st.x === 0, JSON.stringify(st));
    // se mide con la fila quieta: recién movida, las tarjetas que entran todavía no cruzaron el umbral del observador.
    // Si el navegador no puede reproducir H.264, alcanza con que el sitio los haya pedido (data-src → src y play())
    await wait(1500);
    const vid = await p.evaluate(() => {
      const can = document.createElement("video").canPlayType('video/mp4; codecs="avc1.640028"');
      const vis = [...document.querySelectorAll(".pick--video")].filter((c) => { const r = c.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; });
      return { can, visible: vis.length, requested: vis.filter((c) => c.querySelector(".pick__video").getAttribute("src")).length, playing: vis.filter((c) => c.classList.contains("is-playing")).length };
    });
    ok("historias: los videos que se ven arrancan solos", vid.visible > 0 && (vid.can ? vid.playing === vid.visible : vid.requested === vid.visible), JSON.stringify(vid));
    await p.click(".stories__next"); await wait(900);
    const x1 = await p.$eval(".stories", (s) => s.scrollLeft);
    ok("historias: «siguientes» avanza la fila", x1 > 100, `scrollLeft ${x1}`);
    await p.click('[data-toggle="picks"]'); await wait(400);
    const paused = await p.evaluate(() => [...document.querySelectorAll(".pick__video")].every((v) => v.paused));
    ok("historias: «Pausar videos» los pausa a todos", paused, String(paused));
    // la fila tiene su barra de scroll a la vista y las tarjetas no se arrastran como link (Braian, 20/10)
    const sb = await p.evaluate(() => { const s = document.querySelector(".stories"); const cs = getComputedStyle(s); const a = document.querySelector(".pick__link");
      return { scrollbar: cs.scrollbarWidth, overflow: cs.overflowX, barH: s.offsetHeight - s.clientHeight, draggable: a.draggable, userDrag: getComputedStyle(a).webkitUserDrag || "" }; });
    ok("historias: barra de scroll visible y tarjetas que no se arrastran como link", sb.scrollbar !== "none" && sb.overflow === "auto" && sb.draggable === false && sb.userDrag === "none", JSON.stringify(sb));
    // un arrastre con el mouse sobre una tarjeta: al soltar no la abre, y después mover el mouse no mueve la fila
    // (se apunta al centro de una tarjeta que se vea entera: el centro de la fila puede caer en el hueco entre dos)
    const cardAt = () => p.evaluate(() => { const a = [...document.querySelectorAll(".pick__link")].map((l) => l.getBoundingClientRect()).find((r) => r.left >= 0 && r.right <= innerWidth && r.top >= 0);
      return a ? { x: a.left + a.width / 2, y: a.top + a.height / 2 } : null; });
    const read = () => p.evaluate(() => ({ x: document.querySelector(".stories") ? document.querySelector(".stories").scrollLeft : null, url: location.pathname })).catch(() => ({ x: null, url: "navegó" }));
    const box = await cardAt();
    await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x - 200, box.y, { steps: 8 }); await p.mouse.up(); await wait(600);
    const x2 = await read();
    await p.mouse.move(box.x + 300, box.y + 40, { steps: 8 }); await wait(300);
    const x3 = await read();
    ok("historias: arrastrar y soltar sobre una tarjeta no la abre, y después el mouse no mueve la fila", x2.x !== null && x3.x === x2.x && !/trabajos|navegó/.test(x2.url + x3.url), JSON.stringify({ box, x2, x3 }));
    // qué hago: la vista previa sigue al mouse
    await p.evaluate(() => scrollTo({ top: document.getElementById("hago").offsetTop + 200, behavior: "instant" })); await wait(700);
    const row = await p.$eval(".svc[data-preview]", (r) => { const b = r.getBoundingClientRect(); return { x: b.left + b.width * 0.4, y: b.top + b.height / 2, src: r.dataset.preview }; });
    await p.mouse.move(row.x - 40, row.y); await p.mouse.move(row.x, row.y, { steps: 4 }); await wait(500);
    const pv = await p.evaluate(() => { const v = document.querySelector(".svc-preview"); return { on: v.classList.contains("is-on"), src: v.querySelector("img").getAttribute("src"), op: getComputedStyle(v).opacity }; });
    ok("qué hago: al pasar por una fila aparece su foto de ejemplo", pv.on && pv.src === row.src && +pv.op > .5, JSON.stringify(pv));
    // el seguidor: la luz sigue al mouse en una sección oscura
    const spot = await p.$eval("#hago", (s) => ({ sx: s.style.getPropertyValue("--sx"), on: s.style.getPropertyValue("--spot-on") }));
    ok("seguidor: la luz sigue al mouse en las secciones oscuras", /px$/.test(spot.sx) && spot.on === "1", JSON.stringify(spot));
    // haces de luz: se pausan fuera de pantalla
    const beams = await p.$eval(".hero .beams", (b) => b.classList.contains("is-paused"));
    ok("haces de luz: pausados cuando la portada no se ve", beams, String(beams));
    // y el clic de siempre (sin moverse) sí abre el trabajo
    await p.evaluate(() => scrollTo({ top: document.querySelector(".stories").getBoundingClientRect().top + scrollY - 40, behavior: "instant" })); await wait(600);
    const card = await cardAt();
    await Promise.all([p.waitForNavigation({ timeout: 8000 }).catch(() => null), p.mouse.click(card.x, card.y)]);
    const opened = await p.evaluate(() => location.pathname + location.hash);
    ok("historias: un clic normal en una tarjeta sí abre el trabajo", /trabajos\.html#/.test(opened), opened);
    await p.close();
    // videoclips: al pasar el mouse se bajan y pasan los otros dos fotogramas
    p = await newPage(b, 1440, 900);
    await p.goto(BASE + "/trabajos.html#videoclips", { waitUntil: "networkidle0" }); await wait(500);
    const pre = await p.$$eval(".clip:first-child img[data-srcset]", (l) => l.length);
    const c = await p.$eval(".clip:first-child .clip__media", (m) => { const r = m.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(c.x, c.y, { steps: 3 }); await wait(1600);
    const fl = await p.evaluate(() => { const imgs = [...document.querySelectorAll(".clip:first-child .clip__f")]; return { armed: imgs.filter((i) => i.getAttribute("srcset")).length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 1).length, anim: imgs[1].getAnimations().length > 0 }; });
    ok("videoclips: los otros dos fotogramas se bajan recién al pasar el mouse y pasan", pre === 2 && fl.armed === 3 && fl.loaded === 3 && fl.anim, JSON.stringify({ pre, ...fl }));
    await p.close();
  }

  /* 7c) la cinta (Braian, 20/10): todo lo que es video va en película con perforaciones, las fotos no, y la barra
     de abajo («01 … ▸ jottav») entra entera hasta en 320 px */
  if (!only || only === "v2" || only === "cinta") {
    for (const [page, w, h] of [["/", 1440, 900], ["/", 320, 568], ["/trabajos.html", 1440, 900], ["/trabajos.html", 320, 568]]) {
      const p = await newPage(b, w, h);
      await p.goto(BASE + page, { waitUntil: "networkidle0" });
      if (PLANT === "cinta") await p.evaluate(() => { const c = document.querySelector(".film__cap span"); if (c) c.textContent = "showreel completo de la temporada"; });
      const f = await p.evaluate(() => {
        const has = (e) => e.classList.contains("film") || !!e.querySelector(".film");
        const vids = [...document.querySelectorAll(".reel, .pick--video, .pick--flip")];
        const photos = [...document.querySelectorAll(".pick--photo, .print--hero, .frame")];
        const caps = [...document.querySelectorAll(".film__cap")];
        const film = document.querySelector(".film");
        return { videos: vids.length, sinCinta: vids.filter((e) => !has(e)).length, fotosConCinta: photos.filter(has).length, barras: caps.length,
          cortadas: caps.filter((c) => c.offsetWidth && c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent.trim()),
          perforaciones: !!film && /repeating-linear-gradient/.test(getComputedStyle(film, "::before").backgroundImage) };
      });
      ok(`cinta ${page} ${w}px: los videos la llevan, las fotos no, y la barra entra entera`,
        f.videos > 0 && !f.sinCinta && !f.fotosConCinta && f.barras >= f.videos && !f.cortadas.length && f.perforaciones, JSON.stringify(f));
      await p.close();
    }
  }

  /* 8) portada: el reel no pisa el texto ni la barra (contra los renglones), en 11 tamaños */
  if (!only || only === "portada") {
    const sizes = [[320, 568], [360, 640], [375, 667], [375, 812], [390, 844], [414, 896], [768, 1024], [1024, 768], [1366, 768], [1440, 900], [1920, 1080], [667, 375], [844, 390]];
    for (const [w, h] of sizes) {
      const p = await newPage(b, w, h);
      await p.goto(BASE + "/", { waitUntil: "networkidle0" }); await wait(2300);
      if (PLANT === "overlap") await p.evaluate(() => { document.querySelector(".reel--hero").style.bottom = "-160px"; });
      // planta del rótulo: las partes vuelven a ser texto corrido (como antes del 20/10, cuando quedaba «Plata» sola abajo)
      if (PLANT === "rotulo") await p.evaluate(() => { const st = document.createElement("style"); st.textContent = ".eyebrow__in{display:block!important;margin:0!important}.eyebrow__p::before{content:' · '!important;width:auto!important}"; document.head.appendChild(st); });
      // el rótulo («Fotógrafo y filmmaker · CABA y La Plata») corta solo entre partes, y el punto de la parte que arranca
      // un renglón queda fuera del recuadro (recortado). Se mide letra por letra: cada parte, todas sus letras en un renglón
      const eb = await p.evaluate(() => {
        const box = document.querySelector(".hero .eyebrow"), parts = [...box.querySelectorAll(".eyebrow__p")];
        const tops = (sp) => { const s = [], tn = sp.firstChild; for (let i = 0; i < tn.length; i++) { const rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + 1); const rc = rg.getClientRects()[0]; if (rc && rc.width) s.push(Math.round(rc.top)); } return s; };
        const bl = box.getBoundingClientRect().left, clip = getComputedStyle(box).overflowX === "hidden";
        const split = parts.filter((sp) => new Set(tops(sp)).size > 1).map((sp) => sp.textContent);
        // una parte arranca renglón si es la primera o si su primera letra está más abajo que la última de la anterior:
        // ahí su punto (::before, dentro de su caja) tiene que quedar a la izquierda del recuadro, que lo recorta
        const starts = parts.filter((sp, k) => k === 0 || tops(sp)[0] > tops(parts[k - 1]).slice(-1)[0]);
        const dotVisible = starts.filter((sp) => !(clip && sp.getBoundingClientRect().left < bl - 1)).map((sp) => sp.textContent);
        return { parts: parts.length, split, dotVisible, rows: new Set(parts.flatMap(tops)).size };
      });
      ok(`portada ${w}×${h}: el rótulo corta entre partes, sin punto colgando`, eb.parts >= 2 && !eb.split.length && !eb.dotVisible.length, JSON.stringify(eb));
      const r = await p.evaluate(() => {
        const reel = document.querySelector(".reel--hero").getBoundingClientRect();
        const nav = document.querySelector(".nav").getBoundingClientRect();
        const lines = [];
        for (const el of document.querySelectorAll(".hero__text .eyebrow, .hero__line, .hero__lead, .hero__cta .btn, .hero__cap")) { const rg = document.createRange(); rg.selectNodeContents(el); for (const rc of rg.getClientRects()) if (rc.width > 2) lines.push(rc); }
        const hit = lines.filter((l) => l.left < reel.right && l.right > reel.left && l.top < reel.bottom && l.bottom > reel.top).length;
        const cta = document.querySelector(".hero__cta").getBoundingClientRect();
        const title = document.querySelector(".hero__title").getBoundingClientRect();
        const lineCount = [...document.querySelectorAll(".hero__line")].map((l) => Math.round(l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight || 1))).join("/");
        return { hit, underNav: reel.top < nav.bottom, ctaVisible: cta.bottom <= innerHeight, titleVisible: title.bottom <= innerHeight, lines: lineCount, rw: Math.round(reel.right), vw: innerWidth };
      });
      ok(`portada ${w}×${h}: el reel no toca ningún renglón ni la barra`, r.hit === 0 && !r.underNav && r.rw <= r.vw, JSON.stringify(r));
      if (w < 800 && h >= 640 && h > w) ok(`portada ${w}×${h}: título y botones se ven sin bajar`, r.titleVisible && r.ctaVisible, `título ${r.titleVisible} · botones ${r.ctaVisible}`);
      if (h < w && h <= 500) ok(`portada acostado ${w}×${h}: el título entra en una pantalla`, r.titleVisible, `${r.titleVisible}`);
      await p.close();
    }
  }

  /* 9) nitidez: la foto de portada y la de «Sobre mí» no se ven estiradas en pantallas de alta densidad, salvo que la
     original no dé para más. Hasta el 20/10, una foto de ~1000 px (las que llegan por WhatsApp) tenía su medida grande solo
     para el zoom: el retina recibía la de 540 px estirada al doble. Se compara contra el ancho de la ORIGINAL (manifest) */
  if (!only || only === "nitidez") {
    const MAN = require("path").join(__dirname, "..", "..", "assets", "img", "manifest.json");
    const man = JSON.parse(require("fs").readFileSync(MAN, "utf8"));
    for (const [w, h, dpr] of [[390, 844, 3], [1440, 900, 2], [1920, 1080, 2]]) {
      const p = await newPage(b, w, h, { dpr });
      await p.goto(BASE + "/", { waitUntil: "networkidle0" });
      for (const sel of [".print--hero img", ".about__photo img"]) {
        // planta: la foto vuelve a ofrecer solo su medida chica (como antes del arreglo)
        if (PLANT === "nitidez") await p.evaluate((s) => { const i = document.querySelector(s); i.srcset = i.srcset.split(",")[0]; }, sel);
        await p.evaluate((s) => document.querySelector(s).scrollIntoView({ behavior: "instant", block: "center" }), sel);
        await p.waitForFunction((s) => { const i = document.querySelector(s); return i.complete && i.naturalWidth > 0 && i.currentSrc; }, { timeout: 15000 }, sel);
        await wait(400);
        const r = await p.evaluate((s) => {
          const i = document.querySelector(s), b = i.getBoundingClientRect(), ar = i.naturalWidth / i.naturalHeight;
          // ojo: con srcset, naturalWidth viene dividido por la densidad elegida (da píxeles CSS, no los del archivo):
          // el ancho real del archivo servido sale de su nombre (<id>-<ancho>w-<hash>.webp)
          const file = i.currentSrc.split("/").pop(), m = file.match(/-(\d+)w-[0-9a-f]{8}\.webp$/);
          // object-fit: cover → la foto se dibuja al ancho mayor entre el de la caja y el que pide su alto
          return { nat: m ? +m[1] : 0, need: Math.round(Math.max(b.width, b.height * ar) * devicePixelRatio), file };
        }, sel);
        const id = r.file.replace(/-\d+w-[0-9a-f]{8}\.webp$/, ""), src = man[id] ? man[id].w : 0;
        const cap = Math.min(r.need, src || r.need);
        ok(`nitidez ${w}px @${dpr}x ${sel.split(" ")[0]}: la foto no se estira de más`, r.nat >= cap * 0.9,
          `${r.nat} px servidos para ${r.need} px de pantalla · original ${src} px (${r.file})${r.need > src * 1.1 ? " · la original no alcanza para esta pantalla" : ""}`);
      }
      await p.close();
    }
  }

  /* 10) la foto de la portada rota entre las de HERO.images (Braian, 22/10): una sola a la vista, cambia sola en orden,
     el botón del showreel la frena y la vuelve a arrancar, fuera de pantalla se queda quieta; con movimiento reducido no
     rota y las otras ni se bajan; sin JS se ve la primera. Se mide a mitad de camino entre dos cambios (el fundido ya terminó) */
  if (!only || only === "rotacion") {
    const state = () => [...document.querySelectorAll(".print--hero img")].map((i) => ({
      on: i.classList.contains("is-on"), op: +getComputedStyle(i).opacity, aria: i.getAttribute("aria-hidden") !== "true", bajada: !i.getAttribute("src").startsWith("data:") }));
    const activa = (s) => s.findIndex((x) => x.on);
    const sana = (s) => s.filter((x) => x.op > 0.5).length === 1 && s.filter((x) => x.on).length === 1 && s[activa(s)].op > 0.99 && s.every((x) => x.aria === x.on);
    // el obturador (::before y ::after): entre cambios, las dos cortinas tienen que estar afuera del recuadro, enteras
    const cortinas = () => {
      const r = document.querySelector(".print--rotate");
      const afuera = (pe) => { const cs = getComputedStyle(r, pe); return Math.abs(new DOMMatrixReadOnly(cs.transform).m42) >= parseFloat(cs.height) - 1; };
      return !r.classList.contains("is-shut") && afuera("::before") && afuera("::after");
    };
    // el zoom lento de la foto a la vista: «running», «paused» o «ninguno»
    const zoom = () => { const a = document.querySelector(".print--rotate img.is-on").getAnimations().find((x) => x.animationName === "push"); return a ? a.playState : "ninguno"; };
    // plantas: «rotacion» = todas a la vista a la vez (como si faltara el CSS que esconde las que esperan);
    // «obturador» = las cortinas trabadas en el medio
    const plantar = async (p) => {
      if (PLANT === "rotacion") await p.addStyleTag({ content: ".print--rotate img{opacity:1!important}" });
      if (PLANT === "obturador") await p.addStyleTag({ content: ".print--rotate::before,.print--rotate::after{transform:none!important}" });
    };
    {
      const p = await newPage(b, 1440, 900);
      await p.goto(BASE + "/", { waitUntil: "load" }); await plantar(p);
      const { every, n, label } = await p.evaluate(() => ({ every: +document.querySelector(".print--rotate").dataset.every, n: document.querySelectorAll(".print--hero img").length,
        label: document.querySelector(".reel--hero .reel__pause").getAttribute("aria-label") }));
      await wait(every / 2);
      const muestras = [], obt = [], zooms = [];
      for (let j = 0; j <= n; j++) {
        muestras.push(await p.evaluate(state)); obt.push(await p.evaluate(cortinas)); zooms.push(await p.evaluate(zoom));
        if (j < n) await wait(every);
      }
      const orden = muestras.map(activa);
      ok("rotación 1440: cambia sola, en orden y vuelve a la primera", orden.join() === [...Array(n).keys(), 0].join(), `orden ${orden.join(" → ")} · cada ${every} ms`);
      ok("rotación 1440: siempre una sola foto a la vista, y solo esa sin aria-hidden", muestras.every(sana), JSON.stringify(muestras.find((s) => !sana(s)) || "ok"));
      ok("rotación 1440: entre cambios el obturador queda abierto", obt.every(Boolean), obt.join(", "));
      ok("rotación 1440: la foto a la vista se acerca despacio (zoom corriendo)", zooms.every((z) => z === "running"), zooms.join(", "));
      ok("rotación 1440: el botón de pausa dice que frena las fotos", /fotos/.test(label), label);
      // el botón del showreel la frena (también el zoom)…
      await p.click(".reel--hero .reel__pause");
      const quieta = activa(await p.evaluate(state));
      await wait(every * 2);
      const sigue = activa(await p.evaluate(state)), zPausa = await p.evaluate(zoom), oPausa = await p.evaluate(cortinas);
      const lbl = await p.evaluate(() => document.querySelector(".reel--hero .reel__pause").getAttribute("aria-label"));
      ok("rotación 1440: el botón de pausa la frena", sigue === quieta && zPausa === "paused" && oPausa, `antes ${quieta} · ${every * 2} ms después ${sigue} · zoom ${zPausa} · obturador abierto ${oPausa} · «${lbl}»`);
      // …y la vuelve a arrancar
      await p.click(".reel--hero .reel__pause");
      await wait(every * 1.5);
      const despues = activa(await p.evaluate(state));
      ok("rotación 1440: al volver a apretar, sigue rotando", despues !== sigue, `${sigue} → ${despues}`);
      // fuera de pantalla no cambia
      await p.evaluate(() => window.scrollTo({ top: 2400, behavior: "instant" })); await wait(300);
      const abajo = activa(await p.evaluate(state));
      await wait(every * 2);
      const abajo2 = activa(await p.evaluate(state));
      await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await wait(every * 1.5);
      const arriba = activa(await p.evaluate(state));
      ok("rotación 1440: fuera de pantalla se queda quieta y al volver sigue", abajo2 === abajo && arriba !== abajo2, `abajo ${abajo} → ${abajo2} · arriba ${arriba}`);
      await p.close();
    }
    {
      const p = await newPage(b, 375, 812, { reduce: true });
      await p.goto(BASE + "/", { waitUntil: "load" }); await plantar(p);
      const every = await p.evaluate(() => +document.querySelector(".print--rotate").dataset.every);
      await wait(every * 1.6);
      const s = await p.evaluate(state);
      const pedidas = p._req.filter((r) => /\/img\//.test(r.url)).map((r) => r.url);
      const otras = await p.evaluate(() => [...document.querySelectorAll(".print--hero img")].slice(1).map((i) => (i.dataset.src || "").match(/img\/([a-z0-9-]+?)-\d+w-/)?.[1]).filter(Boolean));
      const z = await p.evaluate(zoom), o = await p.evaluate(cortinas);
      ok("rotación con movimiento reducido: queda quieta en la primera, sin zoom, y las otras no se bajan",
        activa(s) === 0 && sana(s) && z === "ninguno" && o && s.slice(1).every((x) => !x.bajada) && otras.length === s.length - 1 && !pedidas.some((u) => otras.some((o) => u.includes("/img/" + o + "-"))), JSON.stringify({ s, otras, zoom: z, obturadorAbierto: o }));
      await p.close();
    }
    {
      const p = await newPage(b, 375, 812, { js: false });
      await p.goto(BASE + "/", { waitUntil: "networkidle0" }); await plantar(p);
      const s = await p.evaluate(state), z = await p.evaluate(zoom), o = await p.evaluate(cortinas);
      ok("rotación sin JS: se ve la primera, quieta, y nada más", activa(s) === 0 && sana(s) && z === "ninguno" && o && s.slice(1).every((x) => !x.bajada), JSON.stringify({ s, zoom: z, obturadorAbierto: o }));
      await p.close();
    }
  }

  await b.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${results.length - fails.length}/${results.length} en verde${fails.length ? ` · ${fails.length} en rojo` : ""}${PLANT ? `  (plantado: ${PLANT})` : ""}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
