/* =============================================================
   CONTENIDO — Julián Gallardo (jottav.)
   -------------------------------------------------------------
   Acá vive TODO lo que se lee en el sitio: textos, trabajos,
   videoclips, herramientas y contacto. El diseño (index.html,
   trabajos.html, assets/css, scripts/templates.js) no se toca
   para cambiar contenido.

   Después de editar:   npm run build      (o   npm start   para verlo)

   ▸ DATOS QUE FALTAN
     Un dato en null (o con confirmed:false) se muestra en el sitio
     con el texto "cambiar después". Cuando lo tengas, completalo y
     desaparece solo. Lista completa: _analisis/pendientes.md

   ▸ FOTOS
     Cada foto se declara en IMAGES con su grupo (carpeta dentro de
     «1 CARPETA PARA BRAI») y el NOMBRE DE ARCHIVO. Se referencia por
     nombre, no por orden: sumar fotos nuevas no rompe nada.
     Para generar las versiones para la web:   npm run optimize

   ▸ VIDEOS
     Igual que las fotos, en VIDEOS (grupo + archivo + tramo).
     loop:true = bucle mudo de pocos segundos · film:true = la pieza
     entera, con sonido, que se ve con un clic.
     Para generar las versiones para la web:   npm run optimize:video

   ▸ VIDEOCLIPS (YouTube)
     En CLIPS. La tapa de cada uno es un FOTOGRAMA del propio video
     (frame 1, 2 o 3 = al 25, 50 o 75 %), no la miniatura oficial,
     que trae el título encima. Para bajarlos:   npm run youtube
   ============================================================= */

/* La carpeta con el material original de Julián (no se mueve ni se publica). */
const SOURCE = "1 CARPETA PARA BRAI";

/* Carpetas. Se busca por el comienzo del nombre, a cualquier profundidad.
   «./» = carpeta de este proyecto (los fotogramas de YouTube que baja npm run youtube). */
const GROUPS = {
  vivo:     "fotos/EVENTOS",
  moda:     "fotos/MODA",
  producto: "fotos/FOTO PRODUCTO",
  books:    "fotos/BOOKS",
  boda:     "fotos/XV Y CASAMIENTOS",
  aire:     "fotos/AIRE LIBRE",
  reels:    "filmmaking/reels",
  yt:       "./_fuentes/youtube",
  fv:       "./_fuentes/video",
  julian:   "julian",                    // sus fotos de perfil (Braian, 20/10)
};

const SITE = {
  name: "Julián Gallardo",
  brand: "jottav",                       // la marca de su logo («jottav.»): el punto lo pone el diseño
  // CAMBIAR DESPUÉS: la marca aparece de tres formas («jotta.av» en el doc, «jottav.» en el logo, @jottavisuals): ¿cuál usa?
  role: "Fotógrafo y filmmaker",
  lang: "es-AR",
  year: 2026,
  location: "La Plata, Buenos Aires",
  description: "Julián Gallardo (jottav.), fotógrafo y filmmaker de La Plata: videoclips, contenido para artistas y marcas, y fotos de shows, moda y casamientos.",
};

/* ---------- portada ---------- */
const HERO = {
  eyebrow: "Fotógrafo y filmmaker · La Plata",
  // se escribe en minúscula y termina con el punto bordó, como su logo «jottav.»
  title: ["videoclips, fotos", "y contenido para", "artistas y marcas"],
  lead: "Dirijo, filmo, monto y coloreo videoclips, y fotografío shows, moda, producto y casamientos, buscando que cada imagen tenga identidad.",
  // v2 «En vivo»: dos pantallas verticales, una foto y el showreel. La foto va a ser la de Julián filmando con el gimbal en un
  // escenario (Braian la pasó el 19/10, pegada en el chat: falta el archivo).
  // CAMBIAR DESPUÉS: con el archivo en «1 CARPETA PARA BRAI», declararla en IMAGES («julian-escenario») y ponerla acá
  image: "vivo-humo",                    // mientras tanto, un show (vertical)
  focus: { m: "50% 35%", d: "50% 35%" }, // encuadre: m = celular, d = escritorio
  video: "hero-showreel",                // montaje vertical de sus trabajos de video (ver SHOWREEL)
  caption: "Showreel: Aurelius, Aryes y Zambia, 2025–2026",
};

/* El showreel de la portada: un montaje vertical con tramos de sus reels (todos sanos). Lo arma `npm run showreel` en
   _fuentes/video/showreel.mp4 (no se publica) y el optimizador lo trata como cualquier bucle (VIDEOS["hero-showreel"]). */
const SHOWREEL = [
  { f: "PRODUCCION AURELIUS .mp4", from: 2.45, dur: 2.0 },                      // la escalera roja y el neón
  { f: "ESTACION DE SERVICIO EN CONSTRUCCION .mp4", from: 67.4, dur: 2.0 },     // el tríptico del dron
  { f: "reel zambia constructora.mp4", from: 15.7, dur: 1.8 },                  // la cuadrilla desde arriba
  { f: "PRODUCCION AURELIUS .mp4", from: 53.8, dur: 1.8 },                      // las zapatillas en la escalera
  { f: "ESTACION DE SERVICIO EN CONSTRUCCION .mp4", from: 46.5, dur: 1.9 },     // el tanque colgando de la grúa
];

/* Con quiénes filmó (la cinta que corre bajo la portada). Son los artistas de sus videoclips, con el crédito público en YouTube. */
const STRIP = ["Lea!", "GZ", "OMAI", "Brunno SR", "Ele De", "Klan", "Esperando el Norte", "Diagonal 8", "Ezein", "Keila", "Cuna de Oro Nacional"];

/* ---------- fotos ---------- */
/* g = grupo · f = archivo · alt = qué se ve (sin nombres de personas que no están confirmados)
   minDb = (opcional) umbral de aviso del optimizador, puesto DESPUÉS DE MIRAR el recorte al 100 %: tember-patada (ramas finas),
           boda-alianzas (grano de la iglesia) y vivo-co2 (humo) dan PSNR bajo por la textura, y a ojo son iguales al original (19/10)
   crop = (opcional) recorte en px del original, antes de achicar: saca el subtítulo de la letra quemado en un fotograma */
const IMAGES = {
  /* — Julián (Braian, 20/10: «perfil de Julián para su sobre mí») — */
  "julian-calle":   { g: "julian", f: "perfil.jpeg", alt: "Julián Gallardo en blanco y negro, en una calle con gente, sonríe mientras saca una foto con la cámara contra la cara." },

  /* — En vivo (2026) — */
  "vivo-abanico":   { g: "vivo", f: "DSC08900.jpg", alt: "Un rapero con buzo gris canta en la pasarela de un escenario grande, entre un abanico de haces de luz blanca y una pantalla roja; adelante, otro fotógrafo levanta la cámara." },
  "vivo-humo":      { g: "vivo", f: "IMG_2474.jpg", alt: "Un artista canta en el escenario de Uniclub entre humo naranja y focos amarillos, con el DJ detrás y una fila de celulares del público abajo." },
  "vivo-co2":       { g: "vivo", f: "DSC09708.jpg", minDb: 33, alt: "Un rapero de musculosa negra señala el cielo entre dos chorros de humo verde iluminado, en un escenario con estructuras metálicas." },
  "vivo-uniclub":   { g: "vivo", f: "IMG_2590.jpg", alt: "Plano general del escenario de Uniclub: un cantante en el centro bajo haces de luz entre el humo, con el público en sombra." },
  "vivo-azul":      { g: "vivo", f: "DSC09780.jpg", alt: "Un artista a contraluz azul en el borde del escenario, con su propia cara gigante en la pantalla del fondo." },
  "vivo-bn":        { g: "vivo", f: "IMG_2713.jpg", alt: "En blanco y negro, tres artistas en el escenario de Uniclub frente a un mar de manos y celulares levantados." },
  "vivo-silla":     { g: "vivo", f: "IMG_4184.jpg", alt: "Una cantante sentada al revés en una silla, en un escenario casi a oscuras, recortada por un haz de luz lateral." },
  "vivo-haces":     { g: "vivo", f: "DSC08743.jpg", alt: "De espaldas, un rapero con campera de tres tiras mira a otro artista entre haces de luz que salen de los dos lados del escenario." },
  "vivo-cian":      { g: "vivo", f: "IMG_6589.jpg", alt: "Un rapero de gorra canta con el micrófono pegado a la boca y una luz cian que estalla detrás de su cabeza." },
  "vivo-gorra":     { g: "vivo", f: "IMG_3839.jpg", alt: "Una cantante de gorra se tapa la boca con la mano, iluminada de costado por una luz dura y verdosa." },
  "vivo-verde":     { g: "vivo", f: "IMG_2651.jpg", alt: "De perfil, un rapero de gorra clara y campera de tres tiras canta bajo un haz de luz verde y naranja." },

  /* — 808 Trap Party (2024) — */
  "808-platinado":  { g: "vivo", f: "5f7b44207704075.66e1ebbe6b3fd.jpg", alt: "Un artista de pelo platinado y anteojos negros canta con luz magenta y cian en la fiesta 808 Trap Party." },
  "808-perfil":     { g: "vivo", f: "a113c1207704075.66e1ebbe02601.jpg", alt: "De perfil, un cantante de pelo enrulado, anteojos espejados y campera roja canta bajo una luz magenta." },
  "808-ojo":        { g: "vivo", f: "732892207704075.66e1f19247392.jpg", alt: "Con lente ojo de pez, un rapero con capucha y anteojos negros rapea hacia la cámara, con el DJ y el público alrededor." },
  "808-glam":       { g: "vivo", f: "67a189207704075.66e1ebbf93b47.jpg", alt: "En contrapicado, una cantante de anteojos envolventes, colitas y cadenas canta con el micrófono, bajo luz violeta." },
  "808-capucha":    { g: "vivo", f: "1f940c207704075.66e1ebbd7fe84.jpg", alt: "Un rapero con capucha negra canta con los ojos cerrados y la mano en la cara, sobre un fondo turquesa." },
  "808-bano":       { g: "vivo", f: "a296f7207704075.66e1f19247b92.jpg", alt: "En un baño cubierto de grafitis, un chico de gorra azul mira a cámara mientras un brazo le apunta con otra cámara." },

  /* — Moda: estudio (2022) y lookbook de TEMBER (2023) — */
  "moda-violeta":   { g: "moda", f: "_MG_0113.jpg", alt: "Retrato de moda en estudio: una modelo con anteojos tipo máscara y la cabeza hacia atrás, sobre un fondo violeta y rosa." },
  "moda-cuero":     { g: "moda", f: "_MG_0098.jpg", alt: "La misma modelo con campera de cuero y guantes de terciopelo bordó, con luz roja de un lado y azul del otro." },
  "moda-mano":      { g: "moda", f: "_MG_0046.jpg", alt: "En angular, una modelo con anteojos ovalados azules estira la mano hacia la lente, sobre un fondo gris lavanda." },
  "moda-beauty":    { g: "moda", f: "_MG_0028.jpg", alt: "Retrato beauty con luz suave: una modelo con aros grandes, cadenas y la mano en el mentón, sobre fondo gris." },
  "tember-gradas":  { g: "moda", f: "_MG_0251.jpg", alt: "Dos modelos con remeras TEMBER sentados en dos niveles de unas gradas de cemento, en un parque." },
  "tember-cupido":  { g: "moda", f: "_MG_0055.jpg", alt: "De espaldas, un modelo tira de su remera blanca con un cupido y la palabra TEMBER, en un rosedal con palmeras." },
  "tember-gomero":  { g: "moda", f: "_MG_0147.jpg", alt: "Dos modelos con remeras TEMBER posan frente a las raíces de un gomero enorme, con luz cálida." },
  "tember-patada":  { g: "moda", f: "_MG_0271.jpg", minDb: 30, alt: "En contrapicado, una modelo lanza una patada hacia la lente debajo de una pérgola blanca." },
  "tember-farol":   { g: "moda", f: "_MG_0255.jpg", alt: "Dos modelos con remeras TEMBER sentados en un parque, con un farol antiguo y árboles detrás." },

  /* — Producto: Kalani (2025) y perfume (2022) — */
  "kalani-lampara": { g: "producto", f: "kalani x jottavisuals-480.jpg", alt: "Una lámpara negra impresa en 3D, encendida, deja salir una luz dorada por sus estrías, junto a una maceta clara sobre madera." },
  "kalani-sombras": { g: "producto", f: "kalani x jottavisuals-615.jpg", alt: "Un florero negro ondulado con flores secas y un florero blanco, con sombras de las flores sobre la pared." },
  "kalani-macro":   { g: "producto", f: "kalani x jottavisuals-530.jpg", alt: "Macro de las capas de un florero ondulado impreso en 3D, con una maceta roja desenfocada detrás." },
  "kalani-colgante":{ g: "producto", f: "kalani x jottavisuals-602.jpg", alt: "Una lámpara colgante mostaza, acanalada, iluminada con una luz dirigida sobre un fondo cálido." },
  "kalani-flores":  { g: "producto", f: "kalani x jottavisuals-470.jpg", alt: "Desde arriba, un florero verde oscuro con flores secas y una lámpara naranja sobre una mesa, contra una pared rosada." },
  "kalani-noche":   { g: "producto", f: "kalani x jottavisuals-719.jpg", alt: "De noche, una lámpara blanca encendida y una maceta con un cactus sobre un individual tejido." },
  "kalani-packshot":{ g: "producto", f: "kalani x jottavisuals-561.jpg", alt: "Una lámpara beige impresa en 3D, centrada sobre madera clara y un fondo blanco." },
  "perfume-cuello": { g: "producto", f: "_MG_0187.jpg", alt: "Un frasco de perfume azul recostado sobre agua oscura, con el cuello dorado grabado y una luz azul en el filo." },
  "perfume-agua":   { g: "producto", f: "_MG_0136.jpg", alt: "El frasco de perfume azul mojado sobre agua marmolada, con luz de borde." },
  "perfume-gotas":  { g: "producto", f: "_MG_0155.jpg", alt: "Macro de la etiqueta dorada del frasco, con microgotas sobre un azul profundo." },

  /* — Casamiento Nati y Seba (2025) — */
  "boda-beso":      { g: "books", f: "9b8f65228458489.68530dcc134d5.jpeg", alt: "En la playa al atardecer, el novio besa en la frente a la novia, que sostiene un ramo de flores secas." },
  "boda-sol":       { g: "books", f: "920b6a228458489.68530dcc11b49.jpeg", alt: "La pareja frente a frente sobre la rambla, con el sol justo entre los dos y el mar detrás." },
  "boda-orilla":    { g: "books", f: "6bc9b9228458489.68530dcc110f9.jpeg", alt: "La pareja abrazada, chica en un paisaje grande, sobre la arena mojada que refleja el cielo rosado." },
  "boda-velo":      { g: "boda", f: "ee91d6228458489.685312ac5e7e0.jpg", alt: "La entrada de la novia de espaldas, con un velo larguísimo sobre la alfombra roja de la iglesia." },
  "boda-alianzas":  { g: "boda", f: "aff4d9228458489.685312ac5cc19.jpg", minDb: 32.5, alt: "Detalle de las manos durante el intercambio de alianzas, con el fondo desenfocado." },
  "boda-altar":     { g: "boda", f: "d3fd22228458489.685312ac5fd42.jpg", alt: "De espaldas, los novios de la mano frente al altar, con el velo y un vitral." },
  "boda-reclinatorio": { g: "boda", f: "294ca9228458489.685312ac5c711.jpg", alt: "Los novios arrodillados en el reclinatorio, con los invitados desenfocados detrás." },
  "boda-entrada":   { g: "boda", f: "d41a84228458489.685312ac5c1bb.jpg", alt: "La novia entra a la iglesia del brazo de un hombre mayor, con luz lateral." },
  "boda-nube":      { g: "books", f: "b6650c228458489.68530dcc14d01.jpeg", alt: "La pareja se besa en la playa bajo una nube enorme iluminada por el atardecer." },
  "boda-huellas":   { g: "books", f: "304f42228458489.68530dcc10912.jpeg", alt: "La pareja camina de espaldas por la playa y sus huellas en la arena llevan la mirada hacia la ciudad." },

  /* — Paisajes (2022–2026) — */
  "paisaje-torres": { g: "aire", f: "_MG_0359.jpg", alt: "Un perro de espaldas mira unas torres de roca con agujeros, bajo un cielo de atardecer." },
  "paisaje-lago":   { g: "aire", f: "3f57b5157502525.637a682296df1.jpeg", alt: "Un lago al anochecer refleja las montañas y el cielo naranja, con una luna finita." },
  "paisaje-carancho": { g: "aire", f: "DSC_0341.jpg", alt: "Un carancho posado sobre una roca, nítido, con el bosque desenfocado detrás." },
  "paisaje-cumbre": { g: "aire", f: "_MG_0266.jpg", alt: "Vista amplia desde una cumbre: valles, cerros pelados y montañas nevadas bajo nubes." },
  "paisaje-orion":  { g: "aire", f: "DSC_0853-2.jpg", alt: "La constelación de Orión sobre un cielo estrellado con nubes, sobre la silueta de los árboles." },
  "paisaje-esfera": { g: "aire", f: "4f8d71157502525.637a682295973.jpeg", alt: "Una esfera de luz violeta pintada a mano en la orilla de un lago, bajo un cielo estrellado." },
  "paisaje-arcoiris": { g: "aire", f: "DSC_0359.jpg", alt: "Un arcoíris sobre un cerro con nubes de tormenta y un bosque de coníferas adelante." },
  "paisaje-rayos":  { g: "aire", f: "_MG_0278.jpg", alt: "Rayos de sol entre las nubes caen sobre un lago, vistos desde lo alto de la montaña." },
};

/* ---------- videos (de «filmmaking/reels») ---------- */
/* crf = (opcional) compresión elegida mirando recortes al 100 % (19/10): la obra de Zambia tiene mucho grano en el hormigón;
   CRF 26 = 2,7 MB · 28 = 2,0 · 30 = 1,5 · 32 = 1,1 en 5,4 s, y hasta 30 se ve igual. El dron de Aryes, 28.
   El archivo de Aurelius está DAÑADO del segundo ~20 al ~50 (se ve una mancha gris): solo se usan tramos sanos. */
const VIDEOS = {
  "hero-showreel":     { g: "fv", f: "showreel.mp4", loop: true, posterAt: 0.6,
                         alt: "Showreel vertical: la escalera roja de Aurelius, el dron sobre la obra de Aryes, la cuadrilla de Zambia desde arriba y el tanque colgando de la grúa." },
  "hero-aurelius":     { g: "reels", f: "PRODUCCION AURELIUS .mp4", from: 53.6, dur: 4, loop: true, posterAt: 1.4,
                         alt: "Unas piernas con pantalón de jean y zapatillas verdes suben una escalera roja." },
  // el comienzo de la campaña (detalles de la ropa → la escalera roja → el neón): la tapa de Aurelius en «lo mejor»
  "aurelius-intro":    { g: "reels", f: "PRODUCCION AURELIUS .mp4", from: 0.3, dur: 4.8, loop: true, posterAt: 2.6,
                         alt: "Detalles de la ropa de la campaña y un modelo con remera camuflada en una escalera roja, bajo el neón de Aurelius." },
  "aurelius-escalera": { g: "reels", f: "PRODUCCION AURELIUS .mp4", from: 2.45, dur: 2.7, loop: true, posterAt: 0.6,
                         alt: "Un modelo con remera camuflada recostado en una escalera roja, bajo el neón de la tienda." },
  "aurelius-sillon":   { g: "reels", f: "PRODUCCION AURELIUS .mp4", from: 58.4, dur: 3, loop: true, posterAt: 0.8,
                         alt: "Un modelo con buzo azul y pantalón deportivo se apoya en un sillón rojo." },
  "aryes-dron":        { g: "reels", f: "ESTACION DE SERVICIO EN CONSTRUCCION .mp4", from: 67.2, dur: 6, loop: true, posterAt: 1, crf: 28,
                         alt: "Tres tomas cenitales de dron: los tanques de combustible bajan con una grúa a las fosas de la obra." },
  "aryes-grua":        { g: "reels", f: "ESTACION DE SERVICIO EN CONSTRUCCION .mp4", from: 44.5, dur: 5.5, loop: true, posterAt: 3,
                         alt: "Un tanque de combustible cuelga de la grúa contra el cielo, mientras la cuadrilla lo guía desde abajo." },
  "aryes-timelapse":   { g: "reels", f: "TIME LAPSE REEL ESTACION DE SERVICIO .mp4", from: 1.4, dur: 7, loop: true, posterAt: 0.5,
                         alt: "Time-lapse de la grúa amarilla moviendo tanques en la obra, con el cielo azul." },
  "aryes-reel":        { g: "reels", f: "ESTACION DE SERVICIO EN CONSTRUCCION .mp4", film: true, posterAt: 8,
                         alt: "Reel completo de la obra de la estación de servicio." },
  "zambia-techo":      { g: "reels", f: "reel zambia constructora.mp4", from: 15.6, dur: 3.4, loop: true, posterAt: 1, crf: 30,
                         alt: "Vista cenital de la cuadrilla subiendo un caño sobre la estructura del techo." },
  "zambia-losa":       { g: "reels", f: "reel zambia constructora.mp4", from: 30.6, dur: 5.4, loop: true, posterAt: 2, crf: 30,
                         alt: "La cuadrilla alisa el hormigón de la losa, con el barrio detrás." },
  "zambia-reel":       { g: "reels", f: "reel zambia constructora.mp4", film: true, posterAt: 23,
                         alt: "Reel completo de la obra de Zambia constructora." },
};

/* ---------- videoclips (YouTube) ---------- */
/* yt = id del video · frame = fotograma de tapa (1, 2 o 3) · date = publicación en YouTube (verificada el 19/10/2026)
   roles = lo que hizo Julián, dicho por él en su doc · lead = los que dirigió (van primero) */
const CLIPS = [
  { yt: "lJ4OtlAQE9U", frame: 1, crop: { left: 0, top: 0, width: 1280, height: 630 }, artist: "Lea!", title: "Autoalusiva", date: "2026-04", roles: ["Dirección", "Cámara", "Montaje", "Color"], lead: true,
    alt: "Un joven sentado en un pastizal alto, en un claro del bosque." },
  { yt: "_Ssee67iqlw", frame: 2, artist: "Brunno SR", title: "No tiene sentido", date: "2025-12", roles: ["Dirección", "Cámara", "Montaje", "Color"], lead: true,
    alt: "Un cantante con chomba blanca canta frente a una ventana con vinilos y una guitarra." },
  { yt: "ikgAaY4aGVw", frame: 2, artist: "Ele De", title: "Pa mí", date: "2025-09", roles: ["Dirección", "Montaje", "Color"], lead: true,
    alt: "Un cantante con buzo crema canta frente a un cerco de plantas." },
  { yt: "5rPOQGjTEuQ", frame: 1, artist: "Lea!", title: "Lucifer", date: "2025-03", roles: ["Dirección", "Montaje", "Color"], lead: true,
    alt: "Primer plano de un joven de perfil con luz cálida, de noche." },
  { yt: "Os9uDPwnxC4", frame: 3, artist: "OMAI", title: "NEMB", date: "2024-09", roles: ["Dirección", "Montaje", "Color"], lead: true,
    alt: "De noche, un cantante con buzo blanco abre los brazos en una calle bajo un farol." },
  { yt: "NK878Lr20dE", frame: 2, artist: "GZ", title: "Sky", date: "2026-08", roles: ["Cámara 1", "Montaje", "Color"],
    alt: "Un rapero sentado en una escalera de hierro, en un ambiente verdoso." },
  { yt: "Zx_8lmecsvs", frame: 3, artist: "Lea!", title: "Flor3s", date: "2024-12", roles: ["Cámara", "Montaje", "Color"],
    alt: "Primer plano nocturno de un joven con buzo oscuro, con luces de la calle detrás." },
  { yt: "AxLvG4hJaVQ", frame: 2, artist: "Lea!", title: "Brillar", date: "2024-06", roles: ["Montaje", "Color"],
    alt: "Un cantante graba frente a un micrófono de estudio al aire libre, con montañas detrás." },
  { yt: "ehBsNbSOJls", frame: 2, artist: "Esperando el Norte", title: "Sangre azul", date: "2025-11", roles: ["Cámara", "Color"],
    alt: "La cantante de la banda canta con los ojos cerrados bajo luz rosa y violeta." },
  { yt: "lPPc9wr2FQU", frame: 2, artist: "OMAI", title: "Alaska", date: "2023-12", roles: ["Cámara", "Color"],
    alt: "Un cantante sentado en un sillón en medio de un campo, con una guitarra roja y una moto." },
  { yt: "V6RLkly5SYw", frame: 2, artist: "Keila", title: "¿Todo pasa por algo?", kind: "Podcast No tan zen", date: "2025-12", roles: ["Cámara", "Color"],
    alt: "Una invitada habla con un micrófono en mano, sentada en un sillón junto a una ventana." },
  { yt: "5NDxyl-mokE", frame: 1, artist: "GZ", title: "Te vas y venís", date: "2026-08", roles: ["Cámara", "Gaffer", "Puesta"],
    alt: "Con lente gran angular, un rapero con campera verde frente a una escalera exterior, de noche." },
  { yt: "J4mtYhpY5R4", frame: 1, artist: "Klan, Yisus, CTZ, One Night, Ried", title: "Conexiones", date: "2026-07", roles: ["Cámara"],
    alt: "Un rapero con campera estampada canta contra una persiana, con luz cálida y fría." },
  { yt: "QGSN71jO9Aw", frame: 2, artist: "Cuna de Oro Nacional", title: "Gran final: DYSE vs. KLAN", kind: "Batalla de freestyle", date: "2026-10", roles: ["Cámara principal"],
    // CAMBIAR DESPUÉS: Julián dice «cámara principal en la primera fecha en teatro» y el link es la gran final: ¿es este video?
    alt: "Dos freestylers se enfrentan en el escenario de un teatro, con el público y las luces detrás." },
  { yt: "YsJ8sTtG8uw", frame: 2, artist: "Ezein", title: "Sauce One One #1", date: "2025-03", roles: ["Cámara", "Asistente de producción"],
    alt: "Un rapero canta con el puño en alto en una sala oscura con humo." },
  { yt: "RjbCv3cOwqc", frame: 3, artist: "Diagonal 8", title: "Fix You", kind: "Cover de Coldplay", date: "2024-12", roles: ["Cámara", "Asistente de producción"],
    alt: "Un coro de hombres de traje en un escenario con luz violeta, con un primer plano superpuesto." },
  { yt: "izrxHKZP9qc", frame: 2, artist: "GZ", title: "Fecha nueva", date: "2026-08", roles: ["Iluminación"],
    alt: "Un rapero con campera inflable canta con lente gran angular, de noche." },
  { yt: "q13L64REdSI", frame: 2, crop: { left: 0, top: 120, width: 1280, height: 600 }, artist: "GZ", title: "Bajo cero", date: "2026-08", roles: ["Gaffer", "Asistente"],
    alt: "Un rapero se tapa la cara con las manos, con una luz azul fría." },
  { yt: "1z-VifqhIlU", frame: 1, artist: "GZ, Sosa 66s", title: "Está mal", date: "2026-08", roles: ["Asistencia general"],
    alt: "Un rapero con capucha blanca y campera roja, de noche, con las luces de los autos desenfocadas." },
];
// CAMBIAR DESPUÉS: los 5 temas de GZ son del EP «Sky»; el doc dice «4 temas» pero lista 5: ¿cuál sobra o falta?

/* las tapas de los videoclips son fotos más (IMAGES) que el optimizador procesa igual que las demás.
   c.flips = los otros dos fotogramas del video (al 25/50/75 %): pasan al pasar el mouse por la tarjeta, para ver más del
   videoclip sin abrirlo. Se bajan recién en ese momento. */
for (const c of CLIPS) {
  const k = c.yt.toLowerCase().replace(/[^a-z0-9]/g, "");
  c.img = "clip-" + k;
  IMAGES[c.img] = { g: "yt", f: `${c.yt}-${c.frame}.jpg`, alt: c.alt, ...(c.crop ? { crop: c.crop } : {}) };
  c.flips = [1, 2, 3].filter((n) => n !== c.frame).map((n) => {
    const id = `clip-${k}-f${n}`;
    IMAGES[id] = { g: "yt", f: `${c.yt}-${n}.jpg`, alt: `Otro fotograma del videoclip «${c.title}», de ${c.artist}.`, lite: true };
    return id;
  });
}

/* ---------- reels para redes (Instagram) ---------- */
const REELS = [
  { kind: "Baile", account: "@talia_daianaa", title: "«Contrabando», coreografía", href: "https://www.instagram.com/reels/DToXUSGjnDZ/", note: "Cámara" },
  { kind: "Baile", account: "@talia_daianaa", title: "«Sudor», en el estudio de danzas KAF", href: "https://www.instagram.com/reels/DMZCRu6O8y6/", note: "Cámara" },
  { kind: "Entrevistas", account: "@valeenpretto", title: "Fans de Oney en su show (4 reels)", href: "https://www.instagram.com/reel/DaBeODJuIGS/", note: null,
    more: ["https://www.instagram.com/reel/DZ-RGLQJj0J/", "https://www.instagram.com/reel/DZ6Kz7FPfEp/", "https://www.instagram.com/reel/DZ5OvvBA8t7/"] },
  { kind: "Deportivo", account: "@gimnasio.mda", title: "Clase de Power Jump", href: "https://www.instagram.com/reels/DUVU7fpDbdS/", note: null },
];

/* ---------- categorías del filtro de trabajos ---------- */
const CATEGORIES = [
  { key: "videoclips", label: "Videoclips" },
  { key: "marcas", label: "Marcas y redes" },
  { key: "foto", label: "Fotografía" },
];

/* ---------- trabajos ---------- */
/* cat = categoría · kind = tipo · year · where = para quién o dónde · text = qué es, en una o dos frases
   roles = qué hizo él (null = no lo dijo: se muestra «cambiar después») · frames = fotos o videos de la galería
   watch = la pieza entera (video propio, con sonido) */
const PROJECTS = [
  /* — video para marcas — */
  { slug: "aurelius", cat: "marcas", title: "Aurelius", kind: "Campaña de ropa", year: "2026",
    where: "Para la tienda Aurelius, con La Plata Sport y Ciudad Gatos",
    text: "Una campaña vertical para redes: neón rojo, escaleras y sillones rojos, y la ropa en detalle.",
    roles: null,   // CAMBIAR DESPUÉS: qué hizo en Aurelius (la carpeta dice «producción»)
    frames: ["hero-aurelius", "aurelius-escalera", "aurelius-sillon"],
    note: "El archivo completo llegó dañado: por ahora se muestran tres tramos." },
  { slug: "aryes", cat: "marcas", title: "Estación de servicio", kind: "Registro de obra", year: "2025",
    where: "Para Aryes Energías",
    text: "La instalación de los tanques de una estación de servicio: el camión, la grúa, la cuadrilla y los tanques ya enterrados, vistos desde el dron. Un reel y un time-lapse.",
    roles: null,   // CAMBIAR DESPUÉS: qué hizo en la obra de Aryes (¿cámara, dron, montaje, color?)
    frames: ["aryes-dron", "aryes-grua", "aryes-timelapse"], watch: { video: "aryes-reel", label: "Ver el reel completo" } },
  { slug: "zambia", cat: "marcas", title: "Zambia constructora", kind: "Reel de obra", year: "2026",
    where: "Para Zambia constructora",
    text: "El avance de una obra: el hormigonado de la losa y la cuadrilla trabajando, con vistas desde arriba.",
    roles: null,   // CAMBIAR DESPUÉS: qué hizo en el reel de Zambia
    frames: ["zambia-techo", "zambia-losa"], watch: { video: "zambia-reel", label: "Ver el reel completo" } },

  /* — fotografía — */
  { slug: "en-vivo", cat: "foto", title: "En vivo", kind: "Fotografía de shows", year: "2026",
    where: "Shows de rap y trap, en Uniclub y otros escenarios",
    text: "Desde el foso y desde el escenario: la luz, el humo, el público y el artista en el mismo cuadro.",
    roles: ["Fotografía"],
    frames: ["vivo-humo", "vivo-co2", "vivo-uniclub", "vivo-silla", "vivo-azul", "vivo-bn", "vivo-cian", "vivo-haces", "vivo-gorra", "vivo-verde", "vivo-abanico"] },
  { slug: "808", cat: "foto", title: "808 Trap Party", kind: "Fiesta", year: "2024",
    where: "Dos ediciones de la fiesta, en mayo y en agosto",
    text: "El escenario chico, el baño grafiteado y la luz de color de una fiesta de trap.",
    roles: ["Fotografía"], tool: "Lightroom",
    frames: ["808-platinado", "808-ojo", "808-perfil", "808-glam", "808-bano", "808-capucha"] },
  { slug: "moda", cat: "foto", title: "Moda", kind: "Estudio y lookbook", year: "2022–2023",
    where: "Una sesión en estudio y el lookbook de TEMBER, urban clothing",
    text: "En estudio, color y actitud; afuera, la ropa de la marca en un rosedal, unas gradas y un gomero.",
    roles: ["Fotografía"],
    frames: ["moda-violeta", "tember-gradas", "moda-cuero", "tember-cupido", "moda-beauty", "tember-gomero", "moda-mano", "tember-patada", "tember-farol"] },
  { slug: "producto", cat: "foto", title: "Producto", kind: "Foto de producto", year: "2022–2025",
    where: "Lámparas y floreros de Kalani, y un perfume sobre agua",
    text: "Piezas impresas en 3D de día, sobre madera, y de noche con la lámpara prendida; un frasco de vidrio con luz de borde, gotas y reflejos.",
    roles: ["Fotografía"],
    frames: ["kalani-lampara", "perfume-cuello", "kalani-sombras", "kalani-macro", "perfume-agua", "kalani-colgante", "kalani-flores", "perfume-gotas", "kalani-noche", "kalani-packshot"] },
  { slug: "casamiento", cat: "foto", title: "Nati y Seba", kind: "Casamiento", year: "2025",
    where: "La preboda en la playa y la ceremonia",
    text: "El atardecer en la costa y la iglesia, con los momentos y los detalles.",
    roles: ["Fotografía"],
    frames: ["boda-beso", "boda-sol", "boda-velo", "boda-orilla", "boda-alianzas", "boda-altar", "boda-reclinatorio", "boda-entrada", "boda-nube", "boda-huellas"] },
  { slug: "xv", cat: "foto", title: "Cumpleaños de XV", kind: "Fiesta de XV", year: "2023–2025",
    where: "Cuatro fiestas: en un salón, en el campo y con un book en un parque de La Plata",
    text: "El book de la previa, la entrada, el baile con la familia y la pista llena de luces.",
    roles: ["Fotografía"],
    frames: ["xv-248f2c186716159-657a285f93246", "xv-3bf44d186716159-6611d8837460e", "xv-8e0a1f186716159-657a24eb373d6", "xv-dsc-0132",
             "xv-0ec9f5186716159-6611d883749a6", "xv-9e2f69186716159-6611d88375070", "xv-8826be186716159-657a24eb38304", "xv-a25db0186716159-6611d88373977"] },
  { slug: "books", cat: "foto", title: "Book en la playa", kind: "Book", year: "2025",
    where: "Dos chicas con vestidos de lentejuelas, un espejo y los molinos de viento",
    text: "Al atardecer, en la orilla: el espejo que devuelve el cielo, las siluetas contra los molinos y los vestidos brillando.",
    roles: ["Fotografía"],
    frames: ["books-img-0207", "books-img-0388", "books-img-0291", "books-img-0367", "books-img-0266", "books-img-0414"] },
  { slug: "paisajes", cat: "foto", title: "Paisajes", kind: "Fotografía de naturaleza", year: "2022–2026",
    where: "Montaña, lagos y bosque",   // CAMBIAR DESPUÉS: ¿dónde son? (parece la zona de Bariloche, donde nació)
    text: "Salidas a la montaña de día y de noche: cumbres, lagos, fauna, cielos con estrellas y light painting.",
    roles: ["Fotografía"],
    frames: ["paisaje-torres", "paisaje-lago", "paisaje-cumbre", "paisaje-carancho", "paisaje-orion", "paisaje-esfera", "paisaje-arcoiris", "paisaje-rayos"] },
];

/* ---------- «Lo mejor» (página principal) ---------- */
/* Braian (19/10): «en lo mejor me gustaría que usemos videos». Van primero los tres trabajos con video propio, como reels
   verticales que se reproducen solos al verse (con botón para pausarlos); después los videoclips (pasan tres fotogramas:
   CAMBIAR DESPUÉS: con los archivos de algún videoclip, esa tarjeta también puede ser video) y una serie de fotos.
   cover = foto o video de tapa · slug "videoclips" = la sección de videoclips. */
const FEATURED = [
  { slug: "aurelius", cover: "aurelius-intro", pos: "50% 50%" },
  { slug: "aryes", cover: "aryes-dron", pos: "50% 50%" },
  { slug: "zambia", cover: "zambia-losa", pos: "50% 50%" },
  { slug: "videoclips", cover: "clip-ssee67iqlw", flip: ["clip-ssee67iqlw", "clip-os9udpwnxc4", "clip-lj4otlaqe9u"], pos: "50% 40%" },
  { slug: "en-vivo", cover: "vivo-co2", pos: "50% 30%" },
  { slug: "moda", cover: "moda-violeta", pos: "50% 25%" },
  { slug: "books", cover: "books-img-0388", pos: "50% 50%" },
  { slug: "casamiento", cover: "boda-sol", pos: "50% 50%" },
];

/* ---------- todas las fotos ---------- */
/* Braian (19/10): «que aparezcan todas las fotos» y «en todas las fotos hay consentimiento de uso». Cada serie de fotos muestra
   primero sus elegidas (frames) y debajo, en un desplegable, el resto de su carpeta: la lista está en fotos.js, con su texto
   alternativo. Las del desplegable se optimizan en dos medidas (lite: tarjeta y visor, sin la de zoom). */
const { SERIES } = require("./fotos.js");
const byFile = new Map(Object.entries(IMAGES).map(([id, im]) => [`${im.g}/${im.f}`, id]));
const alias = {};                 // una foto de fotos.js que ya está declarada arriba (con su alt escrito a mano) usa ese id
for (const list of Object.values(SERIES)) for (const x of list) {
  const known = byFile.get(`${x.g}/${x.f}`);
  if (known) alias[x.id] = known;
  else { IMAGES[x.id] = { g: x.g, f: x.f, alt: x.alt }; byFile.set(`${x.g}/${x.f}`, x.id); }
}
const realId = (id) => alias[id] || id;
for (const p of PROJECTS) {
  p.frames = p.frames.map(realId);
  if (SERIES[p.slug]) { const shown = new Set(p.frames); p.more = SERIES[p.slug].map((x) => realId(x.id)).filter((id) => !shown.has(id)); }
}
const mainImages = new Set([HERO.image, ...PROJECTS.flatMap((p) => p.frames), ...FEATURED.flatMap((f) => [f.cover, ...(f.flip || [])])]);
for (const p of PROJECTS) for (const id of p.more || []) if (!mainImages.has(id)) IMAGES[id].lite = true;

/* ---------- sobre mí ---------- */
/* Texto de Julián (su «about me»), con los clichés que él mismo pidió sacar. Los datos son los suyos. */
const ABOUT = {
  photo: "julian-calle",  // la eligió Braian (20/10)
  photoPos: "54% 32%",    // la cara y la cámara, en el recorte 3:4
  title: "sobre mí",
  paragraphs: [
    "Soy Julián Gallardo, fotógrafo y filmmaker. Nací en Bariloche, vivo en La Plata y soy estudiante avanzado de la Licenciatura en Artes Audiovisuales de la UNLP.",
    "Empecé hace más de ocho años, sacando fotos con mi hermano con una cámara digital y aprendiendo solo. Hoy hago fotografía, video, montaje y dirección de fotografía.",
    "Me gusta probar distintas formas de narrar, y que detrás de cada decisión visual haya una intención.",
    "Trabajo sobre todo en proyectos independientes de música, arte y contenido, y estoy armando una productora propia. Quiero crecer sin perder lo que me importa: empujar ideas, acompañar a artistas nuevos y abrirles lugar a los proyectos que recién empiezan.",
  ],
  // su frase, casi textual de su Google Doc («crear imágenes y piezas visuales que transmitan identidad, construyan atmósferas y conecten genuinamente con quienes las protagonizan»)
  quote: "Imágenes que transmitan identidad, construyan atmósferas y conecten con quienes las protagonizan.",
  stats: [
    { n: "+8", label: "años con la cámara" },
    { n: "19", label: "videos con mi rol" },
    { n: "5", label: "videoclips dirigidos" },
  ],
};

/* Trayectoria: hitos con fecha que salen de su doc, su Behance, YouTube y los archivos. */
const TIMELINE = [
  { year: "+8 años", text: "Empiezo a sacar fotos con mi hermano, con una cámara digital, aprendiendo solo." },
  { year: "2022", text: "Series de paisajes, moda en estudio y foto de producto." },
  { year: "2023", text: "Cámara y color de «Alaska», de OMAI. El lookbook de TEMBER." },
  { year: "2024", text: "Dirijo, monto y coloreo «NEMB», de OMAI. Fotografío la 808 Trap Party." },
  { year: "2025", text: "Dirijo «Lucifer» (Lea!), «Pa mí» (Ele De) y «No tiene sentido» (Brunno SR). El registro de obra para Aryes y un casamiento." },
  { year: "2026", text: "«Autoalusiva» (Lea!), el EP «Sky» de GZ, la cámara principal en Cuna de Oro Nacional, la campaña de Aurelius y shows en Uniclub." },
];

/* ---------- qué hago ---------- */
const SERVICES = {
  title: "qué hago",
  lead: "Puedo hacer todo el proceso o sumarme en una parte: la cámara, la luz, el montaje o el color.",
  items: [
    { n: "01", title: "Videoclips", img: "clip-ssee67iqlw", list: ["Idea y dirección", "Cámara y luz", "Montaje", "Corrección de color"] },
    { n: "02", title: "Contenido para artistas", img: "808-ojo", list: ["Reels de shows y entrevistas", "Videos de baile", "Formato vertical para redes", "Batallas y eventos en vivo"] },
    { n: "03", title: "Fotografía", img: "vivo-co2", list: ["Shows y fiestas", "Retratos, books y moda", "Casamientos y cumpleaños de XV", "Paisaje y naturaleza"] },
    { n: "04", title: "Marcas", img: "kalani-lampara", list: ["Foto de producto", "Campañas de ropa", "Registro de obras", "Reels para redes"] },
  ],
};

/* ---------- herramientas ---------- */
/* confirmed:false = no lo dijo y el material no lo prueba: se muestra «cambiar después».
   icon = pictograma propio de lo que se hace con la herramienta (no el logo de la marca) */
const TOOLS = [
  { group: "Video", items: [
    { name: "DaVinci Resolve", icon: "ruedas", confirmed: true },     // metadatos de los reels de la estación: «Blackmagic Design DaVinci Resolve»
    { name: "Adobe Premiere Pro", icon: "montaje", confirmed: false }, // probable: los reels de Aurelius y Zambia salieron con el códec MainConcept (el de Premiere)
    { name: "Adobe After Effects", icon: "capas", confirmed: false },
  ]},
  { group: "Foto", items: [
    { name: "Adobe Lightroom", icon: "revelado", confirmed: true },    // su Behance (proyecto 808traparty)
    { name: "Adobe Photoshop", icon: "retoque", confirmed: false },
  ]},
];

/* ---------- contacto ---------- */
const CONTACT = {
  title: "hablemos",
  lead: "Contame tu proyecto: un videoclip, una sesión, un show o contenido para tu marca.",
  channels: [
    // Braian (19/10): «2213144443 … y whatsapp». Móvil de La Plata: 549 + 221 + número (sin 0 ni 15). Es el canal principal.
    { key: "whatsapp", label: "WhatsApp", detail: "221 314-4443", href: "https://wa.me/5492213144443", copy: "+54 9 221 314-4443", primary: true },
    { key: "instagram", label: "Instagram", detail: "@jottavisuals", href: "https://www.instagram.com/jottavisuals/" },
    { key: "email", label: "Mail", detail: "juliangallardo249@gmail.com", href: "mailto:juliangallardo249@gmail.com", copy: "juliangallardo249@gmail.com" },
    { key: "instagram2", label: "Instagram personal", detail: "@jotta.gallardo", href: "https://www.instagram.com/jotta.gallardo/" },
    // Braian (19/10): «hacelo» (enlazar su Behance)
    { key: "behance", label: "Behance", detail: "julingallardo", href: "https://www.behance.net/julingallardo" },
  ],
};

const FOOTER = {
  rights: "Los videoclips son de sus artistas y las marcas, de sus dueños.",
};

module.exports = { SOURCE, GROUPS, SITE, HERO, SHOWREEL, STRIP, IMAGES, VIDEOS, CLIPS, REELS, CATEGORIES, PROJECTS, FEATURED, ABOUT, TIMELINE, SERVICES, TOOLS, CONTACT, FOOTER };
