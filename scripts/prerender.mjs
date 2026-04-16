import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_PATH = path.resolve(__dirname, '../dist');
const INDEX_HTML_PATH = path.join(DIST_PATH, 'index.html');

/**
 * Define your product SEO routes here.
 * This ensures the script is fast and independent of the React build.
 */
const ROUTES = [
  {
    path: '/products/ai-job-kit',
    title: 'AI Job Hunter Kit | Land Interviews in 11 Days',
    description: 'The plug-and-play AI prompt system engineered to help you bypass ATS filters and land your dream role. 53+ battle-tested prompts for job seekers.',
    image: 'https://abdulazeez.usaiy.xyz/product-assets/ai-job-kit/Gumroad_Cover_1280x720.png'
  }
  // Add new products here as you create them
];

async function prerender() {
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.error('❌ Error: dist/index.html not found. Run "npm run build" first.');
    process.exit(1);
  }

  const template = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

  console.log('🚀 Starting SEO Prerender...');

  for (const route of ROUTES) {
    const fullPath = path.join(DIST_PATH, route.path);
    
    // Create directory recursively
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    // Replace SEO tags in the template
    let html = template;

    // 1. Update Title
    html = html.replace(/<title>(.*?)<\/title>/, `<title>${route.title}</title>`);
    
    // 2. Update Meta Description
    html = html.replace(
      /<meta name="description" content="(.*?)">/, 
      `<meta name="description" content="${route.description}">`
    );

    // 3. Update OG Tags
    html = html.replace(/property="og:title" content="(.*?)"/, `property="og:title" content="${route.title}"`);
    html = html.replace(/property="og:description" content="(.*?)"/, `property="og:description" content="${route.description}"`);
    html = html.replace(/property="og:image" content="(.*?)"/, `property="og:image" content="${route.image}"`);
    html = html.replace(/property="og:url" content="(.*?)"/, `property="og:url" content="https://abdulazeez.usaiy.xyz${route.path}"`);

    // 4. Update Twitter Tags
    html = html.replace(/property="twitter:title" content="(.*?)"/, `property="twitter:title" content="${route.title}"`);
    html = html.replace(/property="twitter:description" content="(.*?)"/, `property="twitter:description" content="${route.description}"`);
    html = html.replace(/property="twitter:image" content="(.*?)"/, `property="twitter:image" content="${route.image}"`);

    // Write the file
    fs.writeFileSync(path.join(fullPath, 'index.html'), html);
    console.log(`✅ Pre-rendered: ${route.path}`);
  }

  console.log('✨ SEO Prerendering complete!');
}

prerender().catch(console.error);
