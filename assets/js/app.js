/* =============================================================
   app.js — interactividad mínima (el contenido NO depende de esto:
   la página está pre-renderizada y se ve completa sin JS)
   ============================================================= */
(() => {
  "use strict";
  window.__app = true;   // avisa al inline del <head> que el JS cargó (ver index.html)

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const autoplayOK = !reduce && !saveData;
  const hasIO = "IntersectionObserver" in window;
  const watch = (el, cb, threshold = 0, rootMargin = "0px") => {
    if (!hasIO) return cb(true);
    new IntersectionObserver(([en]) => cb(en.isIntersecting, en), { threshold, rootMargin }).observe(el);
  };

  /* apariciones al bajar. Al aparecer las herramientas, sus íconos se dibujan (site.css) */
  const els = document.querySelectorAll("[data-reveal]");
  if (reduce || !hasIO) els.forEach((e) => e.classList.add("is-in"));
  else {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach((e) => io.observe(e));
  }

  /* el «revelado»: la foto aparece como en la cubeta cuando se ve Y ya cargó (si no, se revelaría un papel vacío) */
  const devs = document.querySelectorAll("[data-develop]");
  const develop = (f) => {
    const i = f.querySelector("img");
    const go = () => f.classList.add("is-dev");
    if (!i || (i.complete && i.naturalWidth)) go();
    else { i.addEventListener("load", go, { once: true }); i.addEventListener("error", go, { once: true }); }
  };
  if (reduce || !hasIO) devs.forEach((f) => f.classList.add("is-dev"));
  else {
    const dio = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { develop(en.target); dio.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    devs.forEach((f) => dio.observe(f));
  }

  /* la cinta corre solo mientras se ve */
  const strip = document.querySelector(".strip");
  if (strip) watch(strip, (on) => strip.classList.toggle("is-paused", !on));

  /* videos: mudos y en bucle; se cargan recién cuando hace falta (data-src → src) y se pausan fuera de pantalla.
     Con movimiento reducido o ahorro de datos no arrancan solos (queda el póster) y el botón los reproduce. */
  const playVideo = (v) => {
    if (!v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src;
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {});
  };

  /* un reel (portada o tira de un trabajo) con su botón de pausa. start = cuándo puede arrancar */
  const setupReel = (reel, { threshold, afterLoad }) => {
    const v = reel.querySelector(".reel__video"), b = reel.querySelector(".reel__pause");
    if (!v || !b) return;
    const what = b.getAttribute("aria-label").replace(/^Pausar el /, "");
    let userPaused = !autoplayOK, onScreen = false;
    b.hidden = false;
    const sync = () => {
      b.classList.toggle("is-paused", v.paused);
      b.setAttribute("aria-label", (v.paused ? "Reproducir el " : "Pausar el ") + what);
    };
    v.addEventListener("playing", () => { reel.classList.add("is-playing"); sync(); });
    v.addEventListener("pause", sync);
    b.addEventListener("click", () => {
      if (v.paused) { userPaused = false; playVideo(v); } else { userPaused = true; v.pause(); }
      reel.dispatchEvent(new CustomEvent("reel:pausa", { detail: userPaused }));   // lo escucha la foto que rota en la portada
    });
    const start = () => watch(reel, (on) => { onScreen = on; if (on && !userPaused) playVideo(v); else if (!on && !v.paused) v.pause(); }, threshold);
    if (afterLoad && document.readyState !== "complete") window.addEventListener("load", start, { once: true }); else start();
    document.addEventListener("visibilitychange", () => { if (document.hidden && !v.paused) v.pause(); else if (!document.hidden && onScreen && !userPaused) playVideo(v); });
    sync();
  };
  // portada: después del load, para no disputarle la red a la foto grande
  document.querySelectorAll(".reel--hero").forEach((r) => setupReel(r, { threshold: 0, afterLoad: true }));
  document.querySelectorAll(".reel--strip").forEach((r) => setupReel(r, { threshold: 0.5, afterLoad: false }));

  /* portada: la foto va cambiando sola entre las de HERO.images, con un fundido (Braian, 22/10). Arranca después del load y
     cada foto se baja recién un rato antes de mostrarse. Quieta con movimiento reducido o ahorro de datos (las demás ni se
     bajan), fuera de pantalla, con la pestaña oculta y con el botón de pausa del showreel, que frena las dos cosas */
  const rot = document.querySelector(".print--rotate");
  if (rot && autoplayOK) {
    const imgs = [...rot.querySelectorAll("img")], every = +rot.dataset.every || 4000, PRE = 1500;
    let k = 0, timer = 0, gen = 0, started = false, onScreen = !hasIO, userPaused = false;
    const fetchImg = (i) => {
      if (i.dataset.src) { i.srcset = i.dataset.srcset; i.src = i.dataset.src; delete i.dataset.src; delete i.dataset.srcset; }
      return i.decode ? i.decode().catch(() => {}) : Promise.resolve();
    };
    const show = (n) => {
      imgs[k].classList.remove("is-on"); imgs[k].setAttribute("aria-hidden", "true");
      k = n; imgs[k].classList.add("is-on"); imgs[k].removeAttribute("aria-hidden");
    };
    const stop = () => { gen++; clearTimeout(timer); };
    // un ciclo: a falta de PRE ms baja la que sigue, y al cumplirse el tiempo la muestra (si ya se decodificó; si no, cuando esté)
    const go = () => {
      stop();
      if (!started || userPaused || !onScreen || document.hidden) return;
      const g = gen, n = (k + 1) % imgs.length;
      timer = setTimeout(() => {
        const ready = fetchImg(imgs[n]);
        timer = setTimeout(() => ready.then(() => { if (g === gen) { show(n); go(); } }), PRE);
      }, every - PRE);
    };
    const reel = document.querySelector(".reel--hero");
    if (reel) reel.addEventListener("reel:pausa", (e) => { userPaused = e.detail; go(); });
    watch(rot, (on) => { onScreen = on; go(); });
    document.addEventListener("visibilitychange", go);
    const begin = () => { started = true; go(); };
    if (document.readyState === "complete") begin(); else window.addEventListener("load", begin, { once: true });
  }

  /* «Lo mejor»: las tapas en video (reels verticales) se reproducen solas cuando se ven (Braian: «que usemos videos»), y también
     al pasar el mouse o con el foco. Se mueven más de 5 s: el botón del encabezado las pausa todas (WCAG 2.2.2). Con movimiento
     reducido o ahorro de datos no arrancan solas. En el celular, el lápiz graso marca la tarjeta que se ve. */
  const picks = [...document.querySelectorAll(".pick")];
  const vidPicks = picks.filter((c) => c.querySelector(".pick__video"));
  const pickToggle = document.querySelector('[data-toggle="picks"]');
  if (vidPicks.length) {
    let auto = autoplayOK;
    const st = new Map(vidPicks.map((c) => [c, { seen: false, hover: false }]));
    const want = (c) => { const s = st.get(c); return auto && (s.seen || (s.hover && !reduce)); };
    const sync = (c) => {
      const v = c.querySelector(".pick__video");
      if (want(c)) { playVideo(v); v.addEventListener("playing", () => c.classList.add("is-playing"), { once: true }); }
      else { c.classList.remove("is-playing"); v.pause(); }
    };
    const label = () => {
      if (!pickToggle) return;
      pickToggle.classList.toggle("is-paused", !auto);
      pickToggle.querySelector(".toggle__t").textContent = auto ? "Pausar videos" : "Reproducir videos";
    };
    vidPicks.forEach((c) => {
      const link = c.querySelector(".pick__link");
      link.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { st.get(c).hover = true; sync(c); } });
      link.addEventListener("pointerleave", () => { st.get(c).hover = false; sync(c); });
      link.addEventListener("focus", () => { st.get(c).hover = true; sync(c); });
      link.addEventListener("blur", () => { st.get(c).hover = false; sync(c); });
      watch(c, (on) => { st.get(c).seen = on; sync(c); }, 0.45);
    });
    if (pickToggle) { pickToggle.hidden = false; pickToggle.addEventListener("click", () => { auto = !auto; label(); vidPicks.forEach(sync); }); }
    fine.addEventListener("change", () => vidPicks.forEach(sync));
    label();
  }
  /* fotogramas que pasan al pasar el mouse (la tarjeta de videoclips y cada videoclip): se bajan recién en ese momento */
  document.querySelectorAll(".pick--flip .pick__link, .clip__link").forEach((l) => {
    const arm = () => l.querySelectorAll("img[data-srcset]").forEach((i) => { i.srcset = i.dataset.srcset; i.src = i.dataset.src; i.removeAttribute("data-srcset"); });
    l.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") arm(); }, { once: true });
    l.addEventListener("focus", arm, { once: true });
  });

  /* «lo mejor» como historias: la fila se desliza con su propia barra de scroll (visible), las flechas, la rueda con Shift,
     el trackpad o el dedo. Sin arrastre propio con el mouse: peleaba con el arrastre nativo del navegador (el link se
     «estiraba» y el carrusel quedaba pegado al mouse; Braian, 20/10: «¿y si le ponés un scroll y listo?»). */
  const stories = document.querySelector(".stories");
  if (stories) {
    const prev = document.querySelector(".stories__prev"), next = document.querySelector(".stories__next");
    const max = () => stories.scrollWidth - stories.clientWidth;
    const update = () => {
      const can = max() > 4;
      [prev, next].forEach((e) => { if (e) e.hidden = !can; });
      if (!can) return;
      const x = stories.scrollLeft;
      if (prev) prev.disabled = x <= 4;
      if (next) next.disabled = x >= max() - 4;
    };
    const go = (dir) => stories.scrollBy({ left: dir * stories.clientWidth * 0.75, behavior: reduce ? "auto" : "smooth" });
    if (prev) prev.addEventListener("click", () => go(-1));
    if (next) next.addEventListener("click", () => go(1));
    stories.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(stories); else window.addEventListener("resize", update);
    window.addEventListener("load", update);
    update();
    // las tarjetas no se arrastran como link ni como imagen (el «fantasma» del link al intentar deslizar)
    stories.addEventListener("dragstart", (e) => e.preventDefault());
    // y quien intentó arrastrar con el mouse no abre el trabajo al soltar: si se movió, no fue un clic (el Enter del teclado da detail 0 y pasa siempre)
    let down = null;
    stories.addEventListener("pointerdown", (e) => { down = e.pointerType === "mouse" ? [e.clientX, e.clientY] : null; });
    stories.addEventListener("click", (e) => {
      if (down && e.detail > 0 && e.target.closest("a") && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) e.preventDefault();
      down = null;
    }, true);
  }

  /* los haces de luz se mueven solo mientras se ven */
  document.querySelectorAll(".beams").forEach((b) => watch(b, (on) => b.classList.toggle("is-paused", !on)));

  /* el seguidor: en las secciones oscuras, una luz suave sigue al mouse (como el seguidor de un escenario). Solo con mouse. */
  if (!reduce && fine.matches) document.querySelectorAll("[data-spot]").forEach((s) => {
    let raf = 0, px = 0, py = 0;
    s.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = s.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(() => { s.style.setProperty("--sx", `${px}px`); s.style.setProperty("--sy", `${py}px`); raf = 0; });
    });
    s.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") s.style.setProperty("--spot-on", "1"); });
    s.addEventListener("pointerleave", () => s.style.setProperty("--spot-on", "0"));
  });

  /* «qué hago»: con mouse, al pasar por una fila aparece una foto de ejemplo que sigue al cursor */
  const pv = document.querySelector(".svc-preview");
  if (pv && fine.matches) {
    const pimg = pv.querySelector("img");
    let raf = 0, tx = 0, ty = 0;
    const place = () => { pv.style.setProperty("--px", `${tx}px`); pv.style.setProperty("--py", `${ty}px`); raf = 0; };
    document.querySelectorAll(".svc[data-preview]").forEach((row) => {
      row.addEventListener("pointerenter", (e) => { if (e.pointerType !== "mouse") return; pimg.src = row.dataset.preview; pv.classList.add("is-on"); });
      row.addEventListener("pointerleave", () => pv.classList.remove("is-on"));
      row.addEventListener("pointermove", (e) => {
        tx = Math.min(innerWidth - 240, e.clientX + 28); ty = Math.min(innerHeight - 310, Math.max(10, e.clientY - 150));
        if (!raf) raf = requestAnimationFrame(place);
      });
    });
  }

  /* reproductor de los reels completos (con sonido): los links con data-player abren el archivo en un <dialog>.
     Sin JS (o sin soporte de <dialog>) el link abre el video en el navegador. */
  const player = document.getElementById("player");
  if (player && typeof player.showModal === "function") {
    const pv = player.querySelector("video"), pc = player.querySelector(".player__cap");
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-player]");
      if (!a) return;
      e.preventDefault();
      pv.poster = a.dataset.poster || "";
      pv.src = a.getAttribute("href");
      pc.textContent = a.dataset.title || "";
      if (a.dataset.w && a.dataset.h) player.style.setProperty("--ar", (+a.dataset.w / +a.dataset.h).toFixed(4));
      player.showModal();
      document.documentElement.classList.add("is-locked");
      playVideo(pv);   // lo pidió la persona con un clic: arranca con sonido
    });
    player.querySelector(".player__close").addEventListener("click", () => player.close());
    player.addEventListener("click", (e) => { if (e.target === player) player.close(); });
    player.addEventListener("close", () => {
      pv.pause(); pv.removeAttribute("src"); pv.load();   // corta la descarga al cerrar
      document.documentElement.classList.remove("is-locked");
    });
  }

  /* videoclips: se ven acá, con el reproductor de YouTube sin cookies (youtube-nocookie). El iframe se crea recién al abrir
     (nada de YouTube se carga antes de que alguien lo pida) y se borra al cerrar. Sin JS, el link lleva a YouTube. */
  const yt = document.getElementById("yt");
  if (yt && typeof yt.showModal === "function") {
    const box = yt.querySelector(".yt__frame"), cap = yt.querySelector(".yt__t"), out = yt.querySelector(".yt__out");
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-yt]");
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;   // con Ctrl/⌘ se abre en otra pestaña, como cualquier link
      e.preventDefault();
      const id = a.dataset.yt;
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
      f.title = a.dataset.title || "Videoclip";
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      f.referrerPolicy = "strict-origin-when-cross-origin";
      box.replaceChildren(f);
      cap.textContent = a.dataset.title || "";
      out.href = a.href;
      yt.showModal();
      document.documentElement.classList.add("is-locked");
    });
    yt.querySelector(".yt__close").addEventListener("click", () => yt.close());
    yt.addEventListener("click", (e) => { if (e.target === yt) yt.close(); });
    yt.addEventListener("close", () => { box.replaceChildren(); document.documentElement.classList.remove("is-locked"); });
  }

  /* filtro de trabajos: sin JS la barra queda oculta y se ve todo. El estado va en la URL (?cat=foto), sin ensuciar el historial. */
  const bar = document.getElementById("filterbar");
  if (bar) {
    const chips = [...bar.querySelectorAll("[data-filter]")];
    const projects = [...document.querySelectorAll(".project[data-cat]")];
    const status = document.getElementById("filtersStatus");
    const valid = new Set(chips.map((c) => c.dataset.filter));
    const labelOf = (key) => ((chips.find((c) => c.dataset.filter === key) || {}).firstChild || {}).textContent || "";
    const apply = (key, { push = true, scroll = false } = {}) => {
      if (!valid.has(key)) key = "todos";
      let shown = 0, first = null;
      projects.forEach((p) => {
        const on = key === "todos" || p.dataset.cat === key;
        p.hidden = !on;
        if (on) { shown++; first = first || p; }
      });
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === key)));
      status.textContent = key === "todos" ? `Mostrando los ${projects.length} trabajos` : `Mostrando ${shown} de ${projects.length} trabajos: ${labelOf(key)}`;
      if (push) {
        const u = new URL(location.href);
        if (key === "todos") u.searchParams.delete("cat"); else u.searchParams.set("cat", key);
        history.replaceState(null, "", u);
      }
      const works = document.getElementById("trabajo");
      if (scroll && first && works && works.getBoundingClientRect().top < 0) first.scrollIntoView({ block: "start" });
    };
    bar.hidden = false;
    chips.forEach((c) => c.addEventListener("click", () => apply(c.dataset.filter, { scroll: true })));
    apply(new URLSearchParams(location.search).get("cat") || "todos", { push: false });
    // un link a un trabajo (#aryes) que el filtro dejó oculto: mostrar todo y llevar hasta él
    const reveal = () => {
      const t = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t && t.hidden) { apply("todos"); t.scrollIntoView({ block: "start", behavior: "instant" }); }   // instant: el scroll suave de la página dejaba el salto a mitad de camino
    };
    window.addEventListener("hashchange", reveal);
    reveal();
  }

  /* botón «Copiar» del contacto: avisa con el propio botón y con un aviso para lectores de pantalla. Nace oculto. */
  const copyStatus = document.getElementById("copyStatus");
  const canCopy = !!(navigator.clipboard && window.isSecureContext) || (document.queryCommandSupported && document.queryCommandSupported("copy"));
  document.querySelectorAll(".copy").forEach((b) => {
    if (!canCopy) return;
    b.hidden = false;
    const label = b.querySelector(".copy__t"), original = label.textContent;
    let t;
    b.addEventListener("click", async () => {
      const text = b.dataset.copy;
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; }
      catch {
        const ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand("copy"); } catch { ok = false; }
        ta.remove();
      }
      clearTimeout(t);
      label.textContent = ok ? "¡Copiado!" : "No se pudo";
      b.classList.toggle("is-done", ok);
      if (copyStatus) copyStatus.textContent = ok ? `Copiado: ${text}` : "No se pudo copiar";
      t = setTimeout(() => { label.textContent = original; b.classList.remove("is-done"); }, 1800);
    });
  });

  /* menú del celular: un <dialog> modal, así el foco queda adentro y Esc lo cierra. Sin JS el botón no aparece. */
  const menu = document.getElementById("menu"), menuBtn = document.querySelector(".nav__menu");
  if (menu && menuBtn && typeof menu.showModal === "function") {
    menuBtn.hidden = false;
    const setOpen = (on) => { menuBtn.setAttribute("aria-expanded", String(on)); document.documentElement.classList.toggle("menu-open", on); };
    menuBtn.addEventListener("click", () => { menu.showModal(); setOpen(true); });
    menu.querySelector(".menu__close").addEventListener("click", () => menu.close());
    menu.addEventListener("close", () => setOpen(false));
    menu.querySelectorAll('.menu__list a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const t = document.querySelector(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      menu.close();
      history.pushState(null, "", a.getAttribute("href"));
      t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
      t.focus({ preventScroll: true });
    }));
    window.matchMedia("(min-width: 800px)").addEventListener("change", (m) => { if (m.matches && menu.open) menu.close(); });
  }

  /* menú: marca la sección en la que estás (aria-current), en la barra y en el menú del celular */
  const links = [...document.querySelectorAll('.nav__links a[href^="#"]:not(.btn), .menu__list a[href^="#"]')];
  const secs = [...new Set(links.map((a) => a.getAttribute("href")))].map((h) => document.querySelector(h)).filter(Boolean);
  if (secs.length && hasIO) {
    const so = new IntersectionObserver((entries) => entries.forEach((en) => {
      const mine = links.filter((l) => l.getAttribute("href") === "#" + en.target.id);
      if (!mine.length) return;
      if (en.isIntersecting) { links.forEach((l) => l.removeAttribute("aria-current")); mine.forEach((l) => l.setAttribute("aria-current", "location")); }
      else mine.forEach((l) => l.removeAttribute("aria-current"));
    }), { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    secs.forEach((s) => so.observe(s));
  }

  /* visor de imágenes (<dialog>): sin JS, cada miniatura es un link a la imagen grande.
     ZOOM: clic/toque acerca en ese punto · rueda o pellizco · arrastrar para mover · botones (− + ⤢) y teclado (+ − 0, flechas).
     Al empezar a acercar se baja la versión de alta resolución (data-zoom) para que no se vea borroso. */
  const lb = document.getElementById("lb");
  if (lb && typeof lb.showModal === "function") {
    const img = lb.querySelector(".lb__img");
    const cap = lb.querySelector(".lb__cap");
    const pct = lb.querySelector(".lb__pct");
    let items = [], idx = 0;

    /* ---- estado del zoom: s = escala (1 = ajustado a la pantalla), x/y = desplazamiento en px ---- */
    const Z = { s: 1, x: 0, y: 0, max: 6, zoomUrl: "", zoomed: false };

    // tamaño y centro de LAYOUT, sin transformar. Se leen de offsetLeft/Top/Width/Height (que ignoran transform) y no de
    // getBoundingClientRect: éste refleja la transformación que YA está pintada, y Z cambia antes de pintarse, así que
    // restarle Z desfasaba el centro y dejaba huecos al arrastrar. El diálogo es position:fixed, así que es el offsetParent.
    const geom = () => {
      const o = lb.getBoundingClientRect();
      return { w: img.offsetWidth, h: img.offsetHeight,
               cx: o.left + img.offsetLeft + img.offsetWidth / 2, cy: o.top + img.offsetTop + img.offsetHeight / 2 };
    };
    // que la imagen no se pueda sacar de la pantalla; si es más chica que la pantalla en ese eje, queda centrada
    const fitAxis = (t, lc, size, vp) =>
      size <= vp ? vp / 2 - lc : Math.min(size / 2 - lc, Math.max(vp - size / 2 - lc, t));
    const render = (animate) => {
      img.classList.toggle("is-anim", !!animate);
      img.style.transform = Z.s === 1 ? "" : `translate(${Z.x}px, ${Z.y}px) scale(${Z.s})`;
      lb.classList.toggle("is-zoomed", Z.s > 1.001);
      pct.textContent = (Math.round(Z.s * 10) / 10).toString().replace(".", ",") + "×";
    };
    const constrain = () => {
      if (Z.s <= 1.001) { Z.s = 1; Z.x = 0; Z.y = 0; return; }
      const g = geom();
      Z.x = fitAxis(Z.x, g.cx, g.w * Z.s, lb.clientWidth);
      Z.y = fitAxis(Z.y, g.cy, g.h * Z.s, lb.clientHeight);
    };
    // sube a la versión de alta resolución al empezar a acercar, sin parpadeo (se decodifica antes de cambiar)
    const loadZoom = () => {
      if (!Z.zoomUrl || Z.zoomed || Z.s < 1.05) return;
      Z.zoomed = true;
      const url = Z.zoomUrl, t = new Image();
      t.src = url;
      (t.decode ? t.decode() : Promise.resolve())
        .then(() => { if (Z.zoomUrl === url) img.src = url; })
        .catch(() => { Z.zoomed = false; });
    };
    // acerca/aleja manteniendo fijo el punto (px, py) de la pantalla
    const zoomAt = (ns, px, py, animate) => {
      ns = Math.min(Z.max, Math.max(1, ns));
      const g = geom(), k = ns / Z.s;
      Z.x = (px - g.cx) - k * ((px - g.cx) - Z.x);
      Z.y = (py - g.cy) - k * ((py - g.cy) - Z.y);
      Z.s = ns;
      constrain(); render(animate); loadZoom();
    };
    const reset = (animate) => { Z.s = 1; Z.x = 0; Z.y = 0; render(animate); };
    const center = () => ({ x: lb.clientWidth / 2, y: lb.clientHeight / 2 });

    const show = (i) => {
      idx = (i + items.length) % items.length;
      const a = items[idx], t = a.querySelector("img");
      Z.zoomUrl = a.dataset.zoom || ""; Z.zoomed = false; Z.max = Z.zoomUrl ? 6 : 4;
      reset(false);
      img.src = a.href;
      img.alt = t ? t.alt : "";
      img.title = "Clic para acercar";
      cap.textContent = a.dataset.cap || "";
      new Image().src = items[(idx + 1) % items.length].href;   // precarga la siguiente
    };

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-lb]");
      if (!a) return;
      e.preventDefault();
      items = [...a.closest("[data-gallery]").querySelectorAll("a[data-lb]")];
      show(items.indexOf(a));
      lb.showModal();
    });

    lb.querySelector(".lb__close").addEventListener("click", () => lb.close());
    lb.querySelector(".lb__prev").addEventListener("click", () => show(idx - 1));
    lb.querySelector(".lb__next").addEventListener("click", () => show(idx + 1));
    lb.querySelector(".lb__zoomin").addEventListener("click", () => { const c = center(); zoomAt(Z.s * 1.5, c.x, c.y, true); });
    lb.querySelector(".lb__zoomout").addEventListener("click", () => { const c = center(); zoomAt(Z.s / 1.5, c.x, c.y, true); });
    lb.querySelector(".lb__fit").addEventListener("click", () => reset(true));
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener("close", () => {
      img.removeAttribute("src"); Z.zoomUrl = ""; reset(false); lb.classList.remove("is-panning");
    });

    /* teclado */
    lb.addEventListener("keydown", (e) => {
      const c = center();
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomAt(Z.s * 1.4, c.x, c.y, true); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomAt(Z.s / 1.4, c.x, c.y, true); }
      else if (e.key === "0") { e.preventDefault(); reset(true); }
      else if (e.key.startsWith("Arrow")) {
        if (Z.s > 1.001) {                                  // con zoom, las flechas mueven la imagen
          e.preventDefault();
          const d = 90;
          if (e.key === "ArrowLeft") Z.x += d;
          if (e.key === "ArrowRight") Z.x -= d;
          if (e.key === "ArrowUp") Z.y += d;
          if (e.key === "ArrowDown") Z.y -= d;
          constrain(); render(true);
        } else if (e.key === "ArrowLeft") show(idx - 1);
        else if (e.key === "ArrowRight") show(idx + 1);
      }
    });

    /* rueda del mouse / pinch del trackpad (llega como ctrl+rueda): acerca en el cursor */
    lb.addEventListener("wheel", (e) => {
      if (!lb.open || e.target.closest(".lb__tools")) return;
      e.preventDefault();
      zoomAt(Z.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018)), e.clientX, e.clientY, false);
    }, { passive: false });

    /* punteros: un dedo/mouse arrastra (con zoom) o desliza para cambiar de imagen (sin zoom); dos dedos pellizcan.
       Un toque o clic sin movimiento acerca en ese punto, o vuelve a ajustar si ya hay zoom. */
    const ptrs = new Map();
    let g0 = null, lastToggle = 0, prevDist = 0, prevMid = null;
    const pair = () => {
      const [a, b] = [...ptrs.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    img.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      img.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) g0 = { sx: e.clientX, sy: e.clientY, moved: false };
      if (ptrs.size === 2) { const t = pair(); prevDist = t.d; prevMid = { x: t.x, y: t.y }; if (g0) g0.moved = true; }
    });
    img.addEventListener("pointermove", (e) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 2) {                                // pellizco: escala alrededor del punto medio y arrastra con él
        const t = pair();
        if (prevDist > 0) zoomAt(Z.s * (t.d / prevDist), t.x, t.y, false);
        Z.x += t.x - prevMid.x; Z.y += t.y - prevMid.y;
        constrain(); render(false);
        prevDist = t.d; prevMid = { x: t.x, y: t.y };
        return;
      }
      if (!g0) return;
      if (!g0.moved && Math.hypot(e.clientX - g0.sx, e.clientY - g0.sy) > 6) {
        g0.moved = true;
        if (Z.s > 1.001) lb.classList.add("is-panning");
      }
      if (g0.moved && Z.s > 1.001) { Z.x += dx; Z.y += dy; constrain(); render(false); }
    });
    const endPtr = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      lb.classList.remove("is-panning");
      if (ptrs.size > 0) { if (g0) g0.moved = true; return; }   // terminó un pellizco: no cuenta como clic
      const gg = g0; g0 = null;
      if (!gg || e.type === "pointercancel") return;
      const dx = e.clientX - gg.sx, dy = e.clientY - gg.sy;
      if (!gg.moved) {                                          // clic / toque: alterna zoom (con antirrebote para el doble clic)
        const now = performance.now();
        if (now - lastToggle < 320) return;
        lastToggle = now;
        if (Z.s > 1.001) reset(true); else zoomAt(2.6, e.clientX, e.clientY, true);
      } else if (Z.s <= 1.001 && Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
        show(idx + (dx < 0 ? 1 : -1));                          // deslizar sin zoom: imagen anterior/siguiente
      }
    };
    img.addEventListener("pointerup", endPtr);
    img.addEventListener("pointercancel", endPtr);
    img.addEventListener("dragstart", (e) => e.preventDefault());
    window.addEventListener("resize", () => { if (lb.open) { constrain(); render(false); } });
  }
})();
