/* =============================================================
   browser.js — qué navegador usan las tareas automáticas (hoy: la imagen para compartir, npm run og)
   -------------------------------------------------------------
   NUNCA Microsoft Edge. En Windows 11, Alt+Tab muestra las PESTAÑAS de Edge como entradas sueltas
   (Configuración → Multitarea; viene activado), y eso incluye las páginas de un Edge «invisible» de prueba:
   Braian veía decenas de entradas con el título del sitio con la miniatura en blanco mientras corrían las pruebas (2026-10-13).
   Se usa chrome-headless-shell: Chrome sin interfaz, que no crea ninguna ventana con el título de la página
   (verificado enumerando las ventanas de Windows mientras tenía 3 páginas abiertas: 0 con ese título).

   Orden: 1) CHROME_PATH (si apunta a Edge, se rechaza)  2) el chrome-headless-shell más nuevo de %USERPROFILE%\.cache\puppeteer
   Si no hay ninguno, el error explica cómo bajarlo (una sola vez).
   ============================================================= */
const fs = require("fs");
const path = require("path");
const os = require("os");

const verNum = (v) => v.replace(/^win64-/, "").split(".").map((n) => parseInt(n, 10) || 0);
const newer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0); } return 0; };

function findShell() {
  const base = path.join(os.homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  if (!fs.existsSync(base)) return null;
  for (const v of fs.readdirSync(base).filter((d) => /^win64-/.test(d)).sort(newer)) {
    const exe = path.join(base, v, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

function resolveBrowser() {
  const env = process.env.CHROME_PATH;
  if (env) {
    if (/msedge/i.test(env)) throw new Error("CHROME_PATH apunta a Microsoft Edge, y Edge no se usa para tareas automáticas: sus páginas aparecen en Alt+Tab. Usá chrome-headless-shell (ver scripts/browser.js).");
    if (!fs.existsSync(env)) throw new Error(`CHROME_PATH apunta a un archivo que no existe: ${env}`);
    return { executablePath: env, headless: /chrome-headless-shell/i.test(env) ? "shell" : true };
  }
  const shell = findShell();
  if (shell) return { executablePath: shell, headless: "shell" };
  throw new Error("No encuentro chrome-headless-shell. Bajalo una sola vez con:\n    npx @puppeteer/browsers install chrome-headless-shell@stable --path %USERPROFILE%\\.cache\\puppeteer");
}

module.exports = { resolveBrowser };
