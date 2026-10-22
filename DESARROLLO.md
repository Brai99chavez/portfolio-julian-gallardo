# Desarrollo — portfolio de Julián Gallardo

## Estructura

```
content.js            TODO el contenido: textos, trabajos, videoclips, herramientas, contacto
index.html            plantilla de la página principal (marcadores <!--BUILD:x-->)
trabajos.html         plantilla de la página de trabajos
assets/css/site.css   el diseño (v2 «En vivo», con la paleta de Julián en tokens al principio del archivo)
assets/js/app.js      la interactividad (el sitio se ve completo sin JS)
assets/img/           fotos optimizadas (las genera npm run optimize) + manifest.json
assets/video/         videos optimizados (npm run optimize:video) + manifest.json
assets/brand/         el sello y el logo de jottav.
assets/og.jpg         imagen para compartir (npm run og)
scripts/              build, optimizadores, chequeo de dist/, versiones del diseño, imagen para compartir
dist/                 lo ÚNICO que se publica (lo arma el build)
```

No se publican ni van al repo: `1 CARPETA PARA BRAI/` (los originales de Julián), `_analisis/` (ficha, material, pendientes), `_fuentes/` (fotogramas bajados de YouTube y el showreel montado), `_versiones/` y `dist/`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | instala `sharp` (una vez) |
| `npm run youtube` | baja los fotogramas de los videoclips que se usan de tapa (a `_fuentes/youtube/`) |
| `npm run optimize` | genera las fotos del sitio (WebP q90, tres tamaños, sin EXIF; mide la pérdida) |
| `npm run showreel` | monta el showreel de la portada con los tramos de `SHOWREEL` (a `_fuentes/video/`; después, `npm run optimize:video`) |
| `npm run optimize:video` | genera los videos (H.264 720p, bucles mudos, piezas completas con sonido) |
| `npm run build:revision` | arma `dist/` en **modo revisión** (no indexable: para mostrárselo a Julián) |
| `npm run build` | arma `dist/` en **modo publicación** (con `SITE_URL=https://…`; exige 0 pendientes) |
| `npm start` | arma en modo revisión y lo sirve en http://localhost:5173 |
| `npm run check` | revisa `dist/` antes de subir (referencias, archivos internos, rutas, alt, noopener) |
| `npm run og` | genera `assets/og.jpg` (necesita `npm i --no-save puppeteer-core` y chrome-headless-shell) |
| `npm run zip` | empaqueta `dist/` en `julian-gallardo-sitio.zip` para arrastrarlo a Netlify |
| `npm run diseno -- lista \| guardar <n> \| restaurar <n>` | guarda o vuelve a una versión del diseño (nunca toca `content.js`) |

Versiones del diseño guardadas: ninguna (la v1 «Revelado» se borró entera el 20/10, por pedido de Braian). Ojo: `disenos.js` guarda las plantillas, el CSS, el JS y los scripts del build, no `content.js` ni `scripts/showreel.js`.

## Editar contenido

Todo está en `content.js`. Un dato en `null` (o una herramienta con `confirmed: false`) se muestra como «cambiar después» y el build los cuenta. La lista de lo que falta está en `_analisis/pendientes.md`.

- **Una foto nueva:** dejarla en `1 CARPETA PARA BRAI/fotos/…`, declararla en `IMAGES` (grupo + nombre de archivo + `alt`), sumarla a `frames` de un trabajo y correr `npm run optimize` y `npm run build:revision`.
- **Un videoclip nuevo:** sumarlo a `CLIPS` (id de YouTube, `frame` 1/2/3, artista, tema, fecha y roles) y correr `npm run youtube`, `npm run optimize` y el build.
- **La foto de «Sobre mí»:** declararla en `IMAGES` y ponerla en `ABOUT.photo` (con `photoPos` para el encuadre).
- **Las fotos de la portada:** van en `HERO.images`, en el orden en que rotan (la primera es la que se ve al entrar), cada una con su encuadre (`focus`). `HERO.every` = cada cuánto cambia. Con una sola foto no rota. La imagen para compartir usa `SITE.share`.

## Publicar en Netlify

`netlify.toml` arma hoy el **modo revisión**. Para publicar de verdad: pendientes en 0 y 0, cambiar el comando a `npm run build` y definir `SITE_URL` en Netlify. Antes de subir: `npm run check`.

**Ojo con el tamaño:** `dist/` pesa ~288 MB (938 archivos) y los reels completos de Aryes y Zambia pasan apenas los 10 MB. El soporte de Netlify recomienda que lo que se sube arrastrando (Netlify Drop / `npm run zip`) pese menos de ~50 MB, sin archivos de más de 10 MB. Si el zip se cuelga, subirlo con su CLI, que manda archivo por archivo: `npx netlify-cli deploy --dir=dist` (borrador) y, cuando esté bien, el mismo comando con `--prod`. La otra opción es conectar el repo.

## Pruebas

Se prueba con puppeteer-core y **chrome-headless-shell** (nunca Edge), con el sitio servido (`PORT=5181 node serve.js`):

```
npm i --no-save puppeteer-core
node scripts/pruebas/verify.js http://localhost:5181            # la batería completa
node scripts/pruebas/verify.js http://localhost:5181 --only=cinta   # una sección: anchos, todas, sinjs, teclado, contraste, links, interaccion, red, v2, cinta, portada, nitidez, rotacion
node scripts/pruebas/verify.js http://localhost:5181 --plant=404 --only=anchos   # rompe algo a propósito: tiene que fallar
node scripts/pruebas/alturas.js http://localhost:5181           # alto de cada página en 320/375/768/1440/1920
node scripts/pruebas/shots.js http://localhost:5181/ 375 812 cel  # capturas por tramos (en la carpeta temporal)
```

La batería cubre 5 anchos, sin JS, `app.js` bloqueado, movimiento reducido, teclado, contraste calculado, links, menú, filtro, visor con zoom, videoclips, reproductor, copiar (mail y WhatsApp), peso en la red (y que la foto de portada se baje una sola vez), las historias de «lo mejor» (flechas, videos que arrancan solos, barra de scroll, arrastrar y soltar sin abrir la tarjeta, el clic normal sí), la cinta de los videos el choque del reel con el texto en 13 tamaños, el rótulo de la portada (corta entre partes, sin punto colgando) la nitidez de la foto de portada y la de «Sobre mí» en pantallas de alta densidad, y la rotación de la portada (cambia sola y en orden con el obturador, una sola a la vista, el obturador abierto entre cambios, el zoom lento corriendo, la frenan el botón del showreel y salir de la pantalla, y queda quieta con movimiento reducido y sin JS). Plantas posibles: `404`, `overflow`, `contrast`, `focus`, `overlap`, `cinta`, `rotulo`, `nitidez`, `rotacion`, `obturador`.

Ojo con el puerto: si ya hay un `serve.js` escuchando, puede ser el de otro portfolio. Antes de probar, pedir `/` y mirar el `<title>`.
