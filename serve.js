/* Servidor local — sirve dist/ (lo que se va a publicar).
   Uso:  npm start      ->  http://localhost:5173   (arma dist/ y lo sirve)
   Solo escucha en 127.0.0.1: no se expone a la red. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "dist");
const PORT = process.env.PORT || 5173;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4", ".webm": "video/webm",
};

if (!fs.existsSync(ROOT)) { console.error("\n✗ No existe dist/ — corré: npm run build\n"); process.exit(1); }

http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const filePath = path.join(ROOT, urlPath);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { res.writeHead(404); return res.end("Not found: " + urlPath); }

    const stat = fs.statSync(filePath);
    const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;
    if (range && /^bytes=/.test(range)) {
      const [s, e] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(s, 10), end = e ? parseInt(e, 10) : stat.size - 1;
      res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Content-Type": type });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    res.writeHead(200, { "Content-Length": stat.size, "Content-Type": type, "Accept-Ranges": "bytes" });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500); res.end("Server error");
  }
}).listen(PORT, "127.0.0.1", () => console.log(`\n  ▶  Julián Gallardo en:  http://localhost:${PORT}\n     (Ctrl+C para detener)\n`));
