/* =============================================================
   templates.js — el HTML de cada sección (lo usa build.js)
   -------------------------------------------------------------
   Los textos NO van acá: salen de content.js. Acá solo hay
   estructura. Un dato en null se muestra como «cambiar después».

   Diseño v2 «En vivo» (ver _analisis/ficha.md §9): el sitio como un show en vertical. Pantallas 9:16 como sus
   reels y la mayoría de sus fotos (66 % verticales), la luz de escenario y la noche. Títulos en minúscula con
   punto final y en Poppins, la letra de su logo «jottav.». Tres tonos de sección: data-tone="dark" (la sala),
   "light" (el día) y "accent" (la luz: su bordó).
   ============================================================= */
const { esc } = require("./lib");

const PEND = "cambiar después";
const pend = () => `<span class="pend">${PEND}</span>`;
const arrow = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>`;
const arrowR = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const arrowL = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>`;
const playIco = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>`;
const pad2 = (n) => String(n).padStart(2, "0");
/* la foto de portada: el mismo sizes en el <img> y en su <link rel=preload> (si no coinciden, el navegador baja dos) */
const HERO_SIZES = "(min-width: 900px) 24vw, 46vw";
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
/* todo lo que es video va en cinta de película (las perforaciones las pone .film en el CSS); abajo, el número del
   cuadro y la firma «▸ jottav». Decorativa: lo que dice cada video está en su alt o su aria-label */
const filmCap = (label) => `<span class="film__cap" aria-hidden="true"><span>${label}</span></span>`;

/* título en minúscula con el punto del logo */
const titled = (t) => `${esc(t)}<span class="dot" aria-hidden="true">.</span>`;

/* ---------- imágenes ---------- */
function variantsOf(M, id) {
  const m = M[id];
  if (!m) throw new Error(`La imagen "${id}" no está en assets/img/manifest.json (corré: npm run optimize)`);
  return { m, vs: [...m.variants].sort((a, b) => a.w - b.w) };
}
/* card = tarjetas y portada · big = lo primero que muestra el visor (y la portada en retina) · zoom = solo al hacer zoom */
const byRole = (vs, ...roles) => vs.filter((v) => roles.includes(v.role));
const cardSet = (vs) => byRole(vs, "card");
const heroSet = (vs) => byRole(vs, "card", "big");
const bigOf = (vs) => byRole(vs, "big")[0] || cardSet(vs).slice(-1)[0];
const zoomOf = (vs) => byRole(vs, "zoom")[0] || null;

function img(C, M, id, { sizes, eager = false, cls = "", set = cardSet, alt, defer = false } = {}) {
  const { vs } = variantsOf(M, id);
  const use = set(vs);
  const big = use[use.length - 1];
  const srcset = use.map((v) => `assets/img/${v.file} ${v.w}w`).join(", ");
  const a = esc(alt ?? C.IMAGES[id].alt);
  // defer = la imagen se baja recién cuando app.js la pide (los fotogramas que pasan al pasar el mouse)
  const src = defer ? `src="${BLANK}" data-src="assets/img/${big.file}" data-srcset="${srcset}"` : `src="assets/img/${big.file}" srcset="${srcset}"`;
  return `<img${cls ? ` class="${cls}"` : ""} ${src} sizes="${sizes}" ` +
    `width="${big.w}" height="${big.h}" alt="${a}" decoding="async" ` +
    (eager ? `fetchpriority="high"` : `loading="lazy"`) + `>`;
}
const bigFile = (M, id) => bigOf(variantsOf(M, id).vs).file;
const zoomFile = (M, id) => { const z = zoomOf(variantsOf(M, id).vs); return z ? z.file : ""; };
const shotOf = (M, id) => { const s = M[id] && M[id].shot; return s ? [s.f, s.t, s.iso, s.mm].filter(Boolean).join(" · ") : ""; };

/* ---------- videos ---------- */
function videoOf(V, id) {
  const v = V && V[id];
  if (!v) throw new Error(`El video "${id}" no está en assets/video/manifest.json (corré: npm run optimize:video)`);
  return v;
}
const isVideo = (C, id) => !!(C.VIDEOS && C.VIDEOS[id]);
const mmss = (s) => `${Math.floor(s / 60)}:${pad2(Math.round(s % 60))}`;

/* ---------- botones ---------- */
function button({ label, href, cls = "", detail = "" }, { external = true } = {}) {
  const d = detail ? `<span class="btn__detail">${esc(detail)}</span>` : "";
  if (href) {
    const ext = external ? ` target="_blank" rel="noopener"` : "";
    const end = `${d}${external ? arrow : ""}`;
    return `<a class="btn ${cls}" href="${esc(href)}"${ext}><span class="btn__t">${esc(label)}</span>${end ? `<span class="btn__end">${end}</span>` : ""}</a>`;
  }
  return `<span class="btn btn--pending ${cls}" aria-disabled="true">${esc(label)} ${pend()}</span>`;
}

/* ---------- barra y menú ---------- */
const SECTIONS = [["trabajos", "Trabajos", "works"], ["sobre", "Sobre mí", "home"], ["hago", "Qué hago", "home"], ["contacto", "Contacto", "both"]];
const hrefOf = (id, where, page) => id === "trabajos" ? "trabajos.html"
  : where === "both" || where === page ? `#${id}` : `index.html#${id}`;

function navHTML(C, page) {
  const { SITE } = C;
  const links = SECTIONS.filter(([id]) => id !== "contacto").map(([id, t, where]) =>
    `<a href="${hrefOf(id, where, page)}"${id === "trabajos" && page === "works" ? ' aria-current="page"' : ""}>${esc(t)}</a>`).join("\n      ");
  return `
  <header class="nav" id="nav">
    <a class="nav__brand" href="${page === "home" ? "#top" : "index.html"}" aria-label="${esc(SITE.name)} — inicio">
      <img class="nav__seal" src="assets/brand/sello.webp" width="166" height="139" alt="" aria-hidden="true">
      <span class="nav__words"><span class="nav__mark" aria-hidden="true">${esc(SITE.brand)}<span class="dot">.</span></span><span class="nav__name">${esc(SITE.name)}</span></span>
    </a>
    <nav class="nav__links" aria-label="Principal">
      ${links}
      <a class="btn btn--sm btn--primary" href="#contacto">Escribime</a>
      <!-- celular: abre el menú. Nace oculto: app.js lo muestra si el navegador puede abrirlo -->
      <button class="nav__menu" type="button" aria-label="Abrir el menú" aria-expanded="false" aria-controls="menu" hidden><span class="nav__menu-ico" aria-hidden="true"><i></i><i></i></span></button>
    </nav>
  </header>`;
}

function menuHTML(C, page = "home") {
  const items = SECTIONS.map(([id, t, where], k) =>
    `<li style="--i:${k}"><a href="${hrefOf(id, where, page)}"${id === "trabajos" && page === "works" ? ' aria-current="page"' : ""}><span class="menu__t">${esc(t.toLowerCase())}<span class="dot" aria-hidden="true">.</span></span></a></li>`).join("\n        ");
  const chans = C.CONTACT.channels.filter((c) => c.href).map((c) => {
    const ext = c.key !== "email" ? ` target="_blank" rel="noopener"` : "";
    return `<a class="menu__chan" href="${esc(c.href)}"${ext}><span>${esc(c.label)}</span> <span class="menu__d">${esc(c.detail)}</span>${arrow}</a>`;
  }).join("");
  return `
  <dialog class="menu" id="menu" aria-label="Menú" data-tone="dark">
    <div class="menu__top">
      <img class="nav__seal" src="assets/brand/sello.webp" width="166" height="139" alt="" aria-hidden="true">
      <button class="menu__close" type="button" aria-label="Cerrar el menú">✕</button>
    </div>
    <nav aria-label="Secciones">
      <ol class="menu__list">
        ${items}
      </ol>
    </nav>
    <div class="menu__chans">${chans}</div>
  </dialog>`;
}

/* ---------- portada ---------- */
/* Dos pantallas verticales: una foto y el showreel, sobre la sala a oscuras con los haces de luz que barren
   (como los de sus fotos de shows). El showreel nace sin src (data-src): app.js lo arranca después del load,
   si no hay movimiento reducido ni ahorro de datos, y se puede pausar. Sin JS queda su póster. */
function heroHTML(C, M, V) {
  const { HERO } = C;
  const rotate = HERO.images.length > 1;
  // la rotación se pausa con el botón del showreel (WCAG 2.2.2: lo que se mueve solo más de 5 s se tiene que poder frenar)
  if (rotate && !HERO.video) throw new Error("HERO.images con más de una foto necesita HERO.video: la rotación usa el botón de pausa del showreel");
  // la primera foto se ve al entrar (y sin JS); las demás nacen sin bajar (data-src) y app.js las trae un rato antes de mostrarlas
  const shots = HERO.images.map((h, k) => {
    const vs = heroSet(variantsOf(M, h.img).vs);
    const big = vs[vs.length - 1];
    const srcset = vs.map((v) => `assets/img/${v.file} ${v.w}w`).join(", ");
    const focus = { m: "50% 40%", d: "50% 40%", ...(h.focus || {}) };
    const src = k === 0 ? `src="assets/img/${big.file}" srcset="${srcset}"` : `src="${BLANK}" data-src="assets/img/${big.file}" data-srcset="${srcset}"`;
    return `
          <img${k === 0 ? ' class="is-on"' : ""} ${src} sizes="${HERO_SIZES}"
               width="${big.w}" height="${big.h}" alt="${esc(C.IMAGES[h.img].alt)}"${k === 0 ? ' fetchpriority="high"' : ' aria-hidden="true"'} decoding="async" style="--focus-m:${esc(focus.m)};--focus-d:${esc(focus.d)}">`;
  }).join("");
  const lines = HERO.title.map((t, i) => `<span class="hero__line" style="--i:${i}"><span class="hero__in">${esc(t)}${i === HERO.title.length - 1 ? '<span class="dot" aria-hidden="true">.</span>' : ""}</span></span>`).join(" ");
  // el rótulo, en partes (las separa « · » en content.js): si no entra en un renglón, la parte baja entera y sin el punto (CSS)
  const eyebrow = HERO.eyebrow.split(" · ").map((t) => `<span class="eyebrow__p">${esc(t)}</span>`).join(" ");
  let reel = "";
  if (HERO.video) {
    const v = videoOf(V, HERO.video);
    reel = `
        <figure class="screen reel reel--hero film" style="--ar:${(v.w / v.h).toFixed(4)}">
          <span class="reel__win">
            <img class="reel__poster" src="assets/video/${v.poster}" width="${v.w}" height="${v.h}" alt="${esc(C.VIDEOS[HERO.video].alt)}" fetchpriority="low" decoding="async">
            <video class="reel__video" muted loop playsinline preload="none" data-src="assets/video/${v.file}" aria-hidden="true" tabindex="-1"></video>
          </span>
          ${filmCap("<i></i>showreel")}
          <button class="reel__pause" type="button" aria-label="Pausar el video${rotate ? " y las fotos" : ""}" hidden><i aria-hidden="true"></i></button>
        </figure>`;
  }
  return `
  <section class="hero" id="top" data-tone="dark" data-spot>
    <div class="beams" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="wrap hero__grid">
      <div class="hero__text">
        <p class="eyebrow eyebrow--parts"><span class="eyebrow__in">${eyebrow}</span></p>
        <h1 class="hero__title">${lines}</h1>
        <p class="hero__lead">${esc(HERO.lead)}</p>
        <div class="hero__cta">
          <a class="btn btn--primary btn--lg" href="trabajos.html"><span class="btn__t">Ver trabajos</span>${arrowR}</a>
          <a class="btn btn--ghost btn--lg" href="#contacto"><span class="btn__t">Escribime</span></a>
        </div>
      </div>
      <div class="hero__screens">
        <figure class="screen print--hero${rotate ? " print--rotate" : ""}"${rotate ? ` data-every="${+HERO.every || 4000}"` : ""}>${shots}
        </figure>${reel}
        <p class="hero__cap">${esc(HERO.caption)}</p>
      </div>
    </div>
  </section>${stripHTML(C)}`;
}

/* La cinta: los artistas con los que filmó, en grande y calados, corriendo como el cartel de un festival.
   Decorativa (aria-hidden): los créditos están en trabajos.html. Con movimiento reducido queda quieta. */
function stripHTML(C) {
  const words = C.STRIP || [];
  if (!words.length) return "";
  const set = `<div class="strip__set"><span class="strip__k">filmé con</span>${words.map((w) => `<span class="strip__w">${esc(w)}</span>`).join("")}</div>`;
  return `
  <div class="strip" aria-hidden="true" data-tone="accent"><div class="strip__track">${set}${set}${set}</div></div>`;
}

/* ---------- página principal: «lo mejor», como historias ---------- */
/* Tarjetas verticales que se deslizan de costado (como historias): primero los tres trabajos con video, que se reproducen
   solos al verse (Braian: «que usemos videos»), después los videoclips (una tarjeta horizontal que pasa tres fotogramas)
   y fotos verticales. Flechas y barra de scroll para escritorio; en el celular se deslizan con el dedo. */
function featuredHTML(C, M, V) {
  const list = C.FEATURED || [];
  const titleOf = (f) => f.slug === "videoclips" ? { title: "Videoclips", kind: `${C.CLIPS.length} videos`, year: yearsOfClips(C) }
    : C.PROJECTS.find((x) => x.slug === f.slug);
  let film = 0;   // los cuadros de la cinta se numeran entre los videos (01, 02…), las fotos no llevan
  const cards = list.map((f, k) => {
    const p = titleOf(f);
    if (!p) throw new Error(`FEATURED: no existe el trabajo "${f.slug}"`);
    let media, kind = "photo";
    if (isVideo(C, f.cover)) {
      const v = videoOf(V, f.cover); kind = "video";
      media = `<img class="pick__img" src="assets/video/${v.poster}" width="${v.w}" height="${v.h}" alt="" loading="lazy" decoding="async">` +
        `<video class="pick__video" muted loop playsinline preload="none" data-src="assets/video/${v.file}" aria-hidden="true" tabindex="-1"></video>`;
    } else if (f.flip) {
      kind = "flip";
      media = `<span class="flip">${f.flip.map((id, i) => img(C, M, id, { sizes: "(min-width: 900px) 40vw, 80vw", cls: `pick__img flip__f flip__f--${i}`, alt: "", defer: i > 0 })).join("")}</span>`;
    } else {
      media = img(C, M, f.cover, { sizes: "(min-width: 900px) 22vw, 62vw", cls: "pick__img", alt: "" });
    }
    const years = [...new Set(String(p.year || "").match(/\d{4}/g) || [])];
    const meta = [p.kind, years.join("–")].filter(Boolean).join(" · ");
    const href = f.slug === "videoclips" ? "trabajos.html#videoclips" : `trabajos.html#${esc(p.slug)}`;
    const isFilm = kind !== "photo";   // los videos y la tarjeta de los videoclips
    return `
        <li class="pick pick--${kind}" style="--i:${k}">
          <a class="pick__link${isFilm ? " film" : ""}" href="${href}" draggable="false">
            <span class="pick__media" style="--pos:${esc(f.pos || "50% 45%")}">${media}</span>
            ${kind === "video" ? `<span class="pick__rec" aria-hidden="true"><i></i>video</span>` : ""}
            <span class="pick__body">
              <span class="pick__k">${esc(meta)}</span>
              <h3 class="pick__t">${titled(p.title.toLowerCase())}</h3>
            </span>${isFilm ? filmCap(pad2(++film)) : ""}
          </a>
        </li>`;
  }).join("");
  const anyVideo = list.some((f) => isVideo(C, f.cover));
  const nPhotos = C.PROJECTS.filter((p) => p.cat === "foto").reduce((n, p) => n + p.frames.length + (p.more || []).length, 0);
  return `
  <section class="section picks" id="trabajo" data-tone="dark" data-spot>
    <div class="wrap">
      <div class="head" data-reveal>
        <div>
          <p class="kicker">Selección</p>
          <h2 class="h2">${titled("lo mejor")}</h2>
          <p class="head__lead">Una selección de videos y fotografías. El resto de mis trabajos —${C.CLIPS.length} videoclips, videos para marcas y ${nPhotos} fotografías— está disponible en <a class="link" href="trabajos.html">Trabajos</a>.</p>
        </div>
        <div class="head__tools">
          ${anyVideo ? `<button class="toggle" type="button" data-toggle="picks" hidden><i aria-hidden="true"></i><span class="toggle__t">Pausar videos</span></button>` : ""}
          <button class="arrow stories__prev" type="button" aria-label="Anteriores" hidden>${arrowL}</button>
          <button class="arrow stories__next" type="button" aria-label="Siguientes" hidden>${arrowR}</button>
        </div>
      </div>
    </div>
    <ol class="sheet stories" data-reveal>${cards}
    </ol>
    <div class="wrap">
      <p class="more-wrap" data-reveal>
        <a class="more" href="trabajos.html">
          <span class="more__t">ver todos los trabajos<span class="dot" aria-hidden="true">.</span></span>
          <span class="more__go" aria-hidden="true">${arrowR}</span>
        </a>
      </p>
    </div>
  </section>`;
}
const yearsOfClips = (C) => { const ys = C.CLIPS.map((c) => +c.date.slice(0, 4)); return `${Math.min(...ys)}–${Math.max(...ys)}`; };

/* ---------- sobre mí ---------- */
/* Su foto grande (en blanco y negro, como su firma) y su texto. Una frase suya, en grande. Los números, en una banda.
   El recorrido, como una lista de años. Sin foto todavía: un aviso en el lugar de la foto. */
function aboutHTML(C, M) {
  const { ABOUT, TIMELINE = [] } = C;
  const photo = ABOUT.photo
    ? `<figure class="about__photo" data-develop style="--pos:${esc(ABOUT.photoPos || "50% 30%")}">${img(C, M, ABOUT.photo, { sizes: "(min-width: 900px) 34vw, 86vw" })}</figure>`
    : `<figure class="about__photo about__photo--blank" aria-label="Foto de Julián: ${PEND}"><span class="about__blank"><span>foto de julián</span>${pend()}</span></figure>`;
  const stats = ABOUT.stats.map((s) => `<div class="stat"><b>${esc(s.n)}</b><span>${esc(s.label)}</span></div>`).join("");
  const tl = TIMELINE.map((t, k) => `
          <li class="tl" style="--i:${k}"><b class="tl__y">${esc(t.year)}</b><span class="tl__t">${esc(t.text)}</span></li>`).join("");
  return `
  <section class="section about" id="sobre" data-tone="light">
    <div class="wrap about__grid">
      <div class="about__side" data-reveal>${photo}</div>
      <div class="about__text" data-reveal>
        <p class="kicker">Sobre mí</p>
        <h2 class="h2">${titled("soy julián")}</h2>
        ${ABOUT.paragraphs.map((t) => `<p>${esc(t)}</p>`).join("\n        ")}
      </div>
    </div>
    ${ABOUT.quote ? `<blockquote class="wrap about__quote" data-reveal><p>${esc(ABOUT.quote)}</p></blockquote>` : ""}
    <div class="stats-band" data-tone="dark"><div class="wrap stats">${stats}</div></div>
    ${tl ? `<div class="wrap timeline-wrap" data-reveal>
      <p class="kicker">Recorrido</p>
      <ol class="timeline">${tl}
      </ol>
    </div>` : ""}
  </section>`;
}

/* ---------- qué hago (+ herramientas) ---------- */
/* Filas grandes. Con mouse, al pasar por una, aparece una foto de ejemplo que sigue al cursor (app.js); en el celular,
   la foto va chica al costado. Las herramientas, abajo, en una línea. */
function servicesHTML(C, M) {
  const { SERVICES } = C;
  const rows = SERVICES.items.map((it) => {
    const th = it.img ? img(C, M, it.img, { sizes: "120px", cls: "svc__thumb", alt: "" }) : "";
    const prev = it.img ? ` data-preview="assets/img/${variantsOf(M, it.img).vs.filter((v) => v.role === "card").pop().file}"` : "";
    return `
        <li class="svc"${prev}>
          <span class="svc__n">${esc(it.n)}</span>
          <h3 class="svc__t">${titled(it.title.toLowerCase())}</h3>
          <ul class="svc__l">${it.list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          ${th}
        </li>`;
  }).join("");
  return `
  <section class="section services" id="hago" data-tone="dark" data-spot>
    <div class="wrap">
      <div class="head" data-reveal>
        <div>
          <p class="kicker">Qué hago</p>
          <h2 class="h2">${titled(SERVICES.title)}</h2>
          <p class="head__lead">${esc(SERVICES.lead)}</p>
        </div>
      </div>
      <ol class="svcs" data-reveal>${rows}
      </ol>
      ${toolsHTML(C)}
    </div>
    <div class="svc-preview" aria-hidden="true"><img alt="" src="${BLANK}"></div>
  </section>`;
}

const TOOL_ICONS = { ruedas: 1, montaje: 1, capas: 1, revelado: 1, retoque: 1, generic: 1 };   // el build los valida (en v2 no hay íconos)
function toolsHTML(C) {
  const items = C.TOOLS.flatMap((g) => g.items.map((t) => ({ ...t, group: g.group })));
  return `
      <div class="tools" id="herramientas" data-reveal>
        <h3 class="tools__t">Con qué trabajo</h3>
        <ul class="tools__list">
          ${items.map((t) => `<li class="tool${t.confirmed ? "" : " tool--pending"}"><span class="tool__n">${esc(t.name)}</span><span class="tool__g">${esc(t.group)}</span>${t.confirmed ? "" : ` ${pend()}`}</li>`).join("\n          ")}
        </ul>
      </div>`;
}

/* ---------- contacto ---------- */
/* El sello firma al final, al lado de la ubicación: arriba del título lo tapaba en el celular (Julián, 20/10). */
function contactHTML(C) {
  const { CONTACT, SITE } = C;
  const chans = CONTACT.channels.map((c) => {
    const external = c.key !== "email";
    const btn = button({ label: c.label, href: c.href, detail: c.detail, cls: `btn--chan${c.primary ? " btn--primary" : ""}` }, { external });
    const copy = c.href && c.copy
      ? `<button class="copy" type="button" data-copy="${esc(c.copy)}" aria-label="Copiar ${esc(c.label)}: ${esc(c.copy)}" hidden><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg><span class="copy__t">Copiar</span></button>`
      : "";
    return `<div class="chan${copy ? " chan--split" : ""}${c.primary ? " chan--primary" : ""}">${btn}${copy}</div>`;
  }).join("\n          ");
  return `
  <section class="section contact" id="contacto" data-tone="accent">
    <div class="wrap contact__inner">
      <p class="kicker">Contacto</p>
      <h2 class="contact__title" data-reveal>${titled(CONTACT.title)}</h2>
      <p class="contact__lead">${esc(CONTACT.lead)}</p>
      <div class="contact__actions">
          ${chans}
      </div>
      <p class="sr-only" id="copyStatus" role="status" aria-live="polite"></p>
      <div class="contact__end" data-reveal>
        <p class="contact__meta">${SITE.location ? esc(SITE.location) : `Ubicación ${pend()}`}</p>
        <img class="contact__stamp" src="assets/brand/sello.webp" width="166" height="139" alt="" aria-hidden="true" loading="lazy">
      </div>
    </div>
  </section>`;
}

/* ---------- footer ---------- */
function footerHTML(C) {
  const { SITE, FOOTER } = C;
  return `
  <footer class="footer" data-tone="dark">
    <div class="footer__big" aria-hidden="true">${esc(SITE.brand)}<span class="dot">.</span></div>
    <div class="wrap footer__inner">
      <p>© ${SITE.year} ${esc(SITE.name)}</p>
      <p>${esc(FOOTER.rights)}</p>
      <a class="footer__top" href="#top">Volver arriba ↑</a>
    </div>
  </footer>`;
}

/* =============================================================
   PÁGINA DE TRABAJOS
   ============================================================= */
function worksHeadHTML(C) {
  const cats = C.CATEGORIES.map((c) => c.label.toLowerCase());
  return `
  <section class="works-head" id="top" data-tone="dark" data-spot>
    <div class="beams beams--soft" aria-hidden="true"><i></i><i></i></div>
    <div class="wrap">
      <p class="kicker">Trabajos</p>
      <h1 class="works__title">${titled("trabajos")}</h1>
      <p class="head__lead">${esc(cats.join(" · "))}. En cada uno, lo que hice. Tocá una foto para verla grande y un videoclip para verlo acá mismo.</p>
    </div>
  </section>`;
}

function filtersHTML(C) {
  const counts = { videoclips: C.CLIPS.length };
  for (const p of C.PROJECTS) counts[p.cat] = (counts[p.cat] || 0) + 1;
  if (C.REELS && C.REELS.length) counts.marcas = (counts.marcas || 0) + 1;
  const cats = C.CATEGORIES.filter((c) => counts[c.key]);
  if (cats.length < 2) return "";
  const chip = (key, label, n, on) =>
    `<button type="button" class="chip" data-filter="${esc(key)}" aria-pressed="${on}">${esc(label)}${n ? `<span class="chip__n" aria-hidden="true">${n}</span>` : ""}</button>`;
  return `
  <div class="filterbar" id="filterbar" hidden>
    <div class="wrap filters" role="group" aria-label="Filtrar trabajos por tipo">
      ${chip("todos", "Todo", 0, "true")}
      ${cats.map((c) => chip(c.key, c.label, counts[c.key], "false")).join("")}
    </div>
    <p class="sr-only" id="filtersStatus" role="status" aria-live="polite"></p>
  </div>`;
}

/* encabezado de cada trabajo */
function labelHTML(p, num, extra = "") {
  const roles = p.roles ? p.roles.map((r) => `<li>${esc(r)}</li>`).join("") : `<li class="roles__pend">Rol ${pend()}</li>`;
  const years = [p.kind, p.year].filter(Boolean).map(esc).join(" · ");
  return `
      <header class="label">
        <p class="label__k"><span class="label__n">${num}</span>${years}</p>
        <h2 class="label__t">${titled(p.title.toLowerCase())}</h2>
        ${p.where ? `<p class="label__where">${esc(p.where)}</p>` : ""}
        ${p.text ? `<p class="label__text">${esc(p.text)}</p>` : ""}
        <ul class="roles" aria-label="Qué hice">${roles}</ul>
        ${extra}
      </header>`;
}

/* ---- videoclips: el fotograma de tapa y, al pasar el mouse, los otros dos; al tocar, se ve acá (YouTube sin cookies) ---- */
function clipsHTML(C, M) {
  const list = C.CLIPS || [];
  if (!list.length) return "";
  const lead = list.filter((c) => c.lead), rest = list.filter((c) => !c.lead);
  const ordered = [...lead, ...rest.sort((a, b) => b.date.localeCompare(a.date))];
  const month = (d) => { const [y, m] = d.split("-"); return `${m}/${y}`; };
  const sizes = "(min-width: 1100px) 30vw, (min-width: 640px) 46vw, 46vw";
  const cards = ordered.map((c, k) => {
    const name = `${c.artist} — ${c.title}`;
    const url = `https://www.youtube.com/watch?v=${c.yt}`;
    const flips = (c.flips || []).map((id, i) => img(C, M, id, { sizes, cls: `clip__img clip__f clip__f--${i + 1}`, alt: "", defer: true })).join("");
    return `
        <li class="clip${c.lead ? " clip--lead" : ""}" style="--i:${k}">
          <a class="clip__link" href="${url}" target="_blank" rel="noopener" data-yt="${esc(c.yt)}" data-title="${esc(name)}" aria-label="Ver «${esc(name)}»${c.lead ? " (dirigido por Julián)" : ""} en YouTube">
            <span class="clip__media">${img(C, M, c.img, { sizes, cls: "clip__img clip__f clip__f--0" })}${flips}<span class="clip__play" aria-hidden="true">${playIco}</span>${c.lead ? `<span class="clip__badge" aria-hidden="true">dirigido</span>` : ""}</span>
            <span class="clip__body">
              <span class="clip__d">${month(c.date)}${c.kind ? ` · ${esc(c.kind)}` : ""}</span>
              <b class="clip__a">${esc(c.artist)}</b>
              <span class="clip__t">${esc(c.title)}</span>
              <span class="clip__r">${c.roles.map(esc).join(" · ")}</span>
            </span>
          </a>
        </li>`;
  }).join("");
  return `
    <article class="project project--clips" id="videoclips" data-cat="videoclips" data-tone="dark" data-spot>
      <div class="wrap">
        <header class="label label--wide">
          <p class="label__k"><span class="label__n">01</span>${list.length} videos · ${yearsOfClips(C)}</p>
          <h2 class="label__t">${titled("videoclips")}</h2>
          <p class="label__text">Con artistas de la escena. Primero los que dirigí; en cada uno, lo que hice. Pasá el mouse para ver más cuadros de cada video.</p>
        </header>
        <ol class="clips">${cards}
        </ol>
      </div>
    </article>`;
}

/* ---- video para marcas: los bucles como una tira de película; la pieza entera, con sonido, en el reproductor ---- */
function reelFrameHTML(C, V, id, k, total, title) {
  const v = videoOf(V, id);
  const alt = C.VIDEOS[id].alt || title;
  return `<figure class="screen reel reel--strip film" style="--ar:${(v.w / v.h).toFixed(4)}">` +
    `<span class="reel__win"><img class="reel__poster" src="assets/video/${v.poster}" width="${v.w}" height="${v.h}" alt="" loading="lazy" decoding="async">` +
    `<video class="reel__video" muted loop playsinline preload="none" data-src="assets/video/${v.file}" width="${v.w}" height="${v.h}" aria-label="Video ${k + 1} de ${total}: ${esc(alt)}"></video></span>` +
    `<button class="reel__pause" type="button" aria-label="Pausar el video ${k + 1} de ${total}" hidden><i aria-hidden="true"></i></button>` +
    filmCap(pad2(k + 1)) +
    `<figcaption class="sr-only">${esc(alt)}</figcaption></figure>`;
}
function watchHTML(C, V, w, title) {
  const v = videoOf(V, w.video);
  return `<a class="btn btn--primary" href="assets/video/${v.file}" data-player data-poster="assets/video/${v.poster}" data-title="${esc(title)}" data-w="${v.w}" data-h="${v.h}"><span class="btn__t">${esc(w.label)}</span><span class="btn__detail">${mmss(v.dur)}</span>${playIco}</a>`;
}

function filmProjectHTML(C, M, V, p, num) {
  const frames = p.frames.map((id, k) => reelFrameHTML(C, V, id, k, p.frames.length, p.title)).join("\n          ");
  const extra = (p.watch ? `<div class="label__watch">${watchHTML(C, V, p.watch, p.title)}</div>` : "") +
    (p.note ? `<p class="label__note">${esc(p.note)}</p>` : "");
  return `
    <article class="project project--film" id="${esc(p.slug)}" data-cat="${esc(p.cat)}" data-tone="dark" data-spot data-reveal>
      <div class="wrap project__grid">
        ${labelHTML(p, num, extra)}
        <div class="filmstrip" role="group" aria-label="Videos: ${esc(p.title)}">
          ${frames}
        </div>
      </div>
    </article>`;
}

/* ---- reels para redes (Instagram) ---- */
function reelsListHTML(C, num) {
  const list = C.REELS || [];
  if (!list.length) return "";
  const rows = list.map((r) => `
          <li class="ig">
            <span class="ig__k">${esc(r.kind)}</span>
            <span class="ig__main"><b>${esc(r.title)}</b> <span class="ig__acc">${esc(r.account)}</span></span>
            <span class="ig__r">${r.note ? esc(r.note) : `Rol ${pend()}`}</span>
            <a class="ig__go" href="${esc(r.href)}" target="_blank" rel="noopener" aria-label="Ver «${esc(r.title)}» en Instagram">Instagram${arrow}</a>
          </li>`).join("");
  return `
    <article class="project project--reels" id="reels" data-cat="marcas" data-tone="dark" data-reveal>
      <div class="wrap">
        <header class="label label--wide">
          <p class="label__k"><span class="label__n">${num}</span>Instagram</p>
          <h2 class="label__t">${titled("reels para redes")}</h2>
          <p class="label__text">Contenido vertical que filmé para cuentas de artistas, bailarinas, un gimnasio y barberías.</p>
        </header>
        <ol class="igs">${rows}
        </ol>
      </div>
    </article>`;
}

/* ---- fotografía: primero las elegidas y, en un <details>, todas las demás de la serie ---- */
function photoProjectHTML(C, M, p, num) {
  const ROWH = 300;
  const all = [...p.frames, ...(p.more || [])];
  const frameHTML = (id, k) => {
    const { m } = variantsOf(M, id);
    const ar = (m.w / m.h).toFixed(4);
    const cap = `${p.title} — ${k + 1}/${all.length}`;
    const z = zoomFile(M, id);
    const shot = shotOf(M, id);
    return `<figure class="frame" style="--ar:${ar}" data-develop>` +
      `<a class="frame__link" href="assets/img/${bigFile(M, id)}"${z ? ` data-zoom="assets/img/${z}"` : ""} data-lb data-cap="${esc(cap)}" aria-label="Ampliar foto ${k + 1} de ${all.length}: ${esc(p.title)}">` +
      img(C, M, id, { sizes: `(min-width: 900px) ${Math.round(+ar * ROWH * 1.25)}px, ${Math.round(+ar * 46)}vw` }) + `</a>` +
      (shot ? `<figcaption class="frame__cap">${esc(shot)}</figcaption>` : "") + `</figure>`;
  };
  const first = p.frames.map((id, k) => frameHTML(id, k)).join("\n          ");
  const rest = (p.more || []).map((id, k) => frameHTML(id, p.frames.length + k)).join("\n            ");
  const n = (p.more || []).length;
  const more = n ? `
          <details class="sheet-more">
            <summary class="sheet-more__btn"><span class="sheet-more__open">Ver las ${n} fotos más</span><span class="sheet-more__close">Ocultar las ${n} fotos</span><span class="sheet-more__n" aria-hidden="true">${all.length} en total</span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary>
            <div class="contact-sheet contact-sheet--more">
            ${rest}
            </div>
          </details>` : "";
  return `
    <article class="project project--photo" id="${esc(p.slug)}" data-cat="${esc(p.cat)}" data-tone="light" data-reveal>
      <div class="wrap">
        ${labelHTML(p, num)}
        <div class="gallery" data-gallery="${esc(p.slug)}">
          <div class="contact-sheet">
          ${first}
          </div>${more}
        </div>
      </div>
    </article>`;
}

function projectsHTML(C, M, V) {
  let n = 1;   // 01 = videoclips
  const film = C.PROJECTS.filter((p) => p.cat !== "foto");
  const photo = C.PROJECTS.filter((p) => p.cat === "foto");
  const out = [clipsHTML(C, M)];
  for (const p of film) out.push(filmProjectHTML(C, M, V, p, pad2(++n)));
  out.push(reelsListHTML(C, pad2(++n)));
  for (const p of photo) out.push(photoProjectHTML(C, M, p, pad2(++n)));
  return out.join("\n");
}

module.exports = { TOOL_ICONS, PEND, HERO_SIZES, heroSet, variantsOf, videoOf, navHTML, menuHTML, heroHTML, featuredHTML, aboutHTML, servicesHTML,
  toolsHTML, contactHTML, footerHTML, worksHeadHTML, filtersHTML, projectsHTML };
