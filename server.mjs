import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3003;
const DIST_DIR = path.join(__dirname, 'dist');

// SEO Mapping - derived from src/data/products.ts
const PRODUCT_SEO = {
  'ai-job-kit': {
    title: 'AI Job Hunter Kit | Land Interviews in 11 Days',
    description: 'The plug-and-play AI prompt system engineered to help you bypass ATS filters and land your dream role. 53+ battle-tested prompts for every stage of the job search.',
    image: 'https://abdulazeez.usaiy.xyz/product-assets/ai-job-kit/Gumroad_Cover_1280x720.png'
  }
};

const DEFAULT_SEO = {
  title: 'Callmehalpha | Systems Engineer & Technical Founder',
  description: 'Portfolio of Callmehalpha - A systems-focused software engineer and technical founder specializing in scalable infrastructure and distributed systems.',
  image: 'https://abdulazeez.usaiy.xyz/logo.png'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

  // Security: Prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
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

  // MIME types mapping
  const ext = path.extname(filePath).toLowerCase();
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
    '.xml': 'application/xml'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        // SPA Fallback: Serve index.html for all non-existent paths (Routes)
        const indexPage = path.join(DIST_DIR, 'index.html');
        fs.readFile(indexPage, (idxError, idxContent) => {
          if (idxError) {
            res.writeHead(500);
            res.end('Error loading index.html');
            return;
          }

          let html = idxContent.toString();

          // DYNAMIC SEO INJECTION
          const productSlug = req.url.split('/products/')[1];
          const seo = PRODUCT_SEO[productSlug] || DEFAULT_SEO;
          
          html = injectSEO(html, seo, req.url);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Direct file serving (usually for index.html at root or CSS/JS assets)
      if (contentType === 'text/html') {
        let html = content.toString();
        // Inject SEO even for direct index.html access (Home)
        html = injectSEO(html, DEFAULT_SEO, req.url);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(html, 'utf-8');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    }
  });
});

function injectSEO(html, seo, url) {
  const fullUrl = `https://abdulazeez.usaiy.xyz${url}`;
  
  return html
    .replace(/<title>(.*?)<\/title>/, `<title>${seo.title}</title>`)
    .replace(/<meta name="title" content="(.*?)">/, `<meta name="title" content="${seo.title}">`)
    .replace(/<meta name="description" content="(.*?)">/, `<meta name="description" content="${seo.description}">`)
    // OG
    .replace(/property="og:title" content="(.*?)"/, `property="og:title" content="${seo.title}"`)
    .replace(/property="og:description" content="(.*?)"/, `property="og:description" content="${seo.description}"`)
    .replace(/property="og:image" content="(.*?)"/, `property="og:image" content="${seo.image}"`)
    .replace(/property="og:url" content="(.*?)"/, `property="og:url" content="${fullUrl}"`)
    // Twitter
    .replace(/property="twitter:title" content="(.*?)"/, `property="twitter:title" content="${seo.title}"`)
    .replace(/property="twitter:description" content="(.*?)"/, `property="twitter:description" content="${seo.description}"`)
    .replace(/property="twitter:image" content="(.*?)"/, `property="twitter:image" content="${seo.image}"`)
    .replace(/property="twitter:url" content="(.*?)"/, `property="twitter:url" content="${fullUrl}"`);
}

server.listen(PORT, () => {
  console.log(`🚀 Production server running at http://localhost:${PORT}`);
  console.log(`📂 Serving from: ${DIST_DIR}`);
});
