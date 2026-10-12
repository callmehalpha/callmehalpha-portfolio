import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiFetcher, cached, injectSEO, resolveSeo } from './server/seo.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3003;
const DIST_DIR = path.join(__dirname, 'dist');
// The content engine, as seen from this server (e.g. http://backend:3000 inside Docker).
const getJson = cached(apiFetcher(process.env.CONTENT_API_URL || process.env.VITE_CONTENT_API_URL));

// MIME types mapping
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon'
};

async function sendHtml(res, html, url) {
  const seo = await resolveSeo(url, getJson);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(injectSEO(html, seo, url), 'utf-8');
}

export const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  } catch {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  // Security: Prevent directory traversal (including into sibling folders like dist2/)
  if (filePath !== DIST_DIR && !filePath.startsWith(DIST_DIR + path.sep)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Check if the requested path is a directory (EISDIR fix)
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {
    // If file doesn't exist, we'll handle it below with SPA fallback
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        // SPA Fallback: Serve index.html for all non-existent paths (Routes)
        fs.readFile(path.join(DIST_DIR, 'index.html'), (idxError, idxContent) => {
          if (idxError) {
            res.writeHead(500);
            res.end('Error loading index.html');
            return;
          }
          sendHtml(res, idxContent.toString(), req.url).catch(() => {
            res.writeHead(500);
            res.end('Server Error');
          });
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else if (contentType === 'text/html') {
      // Inject SEO even for direct index.html access (Home)
      sendHtml(res, content.toString(), req.url).catch(() => {
        res.writeHead(500);
        res.end('Server Error');
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Production server running at http://localhost:${PORT}`);
  console.log(`📂 Serving from: ${DIST_DIR}`);
});
