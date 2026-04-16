import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import prerender from 'vite-plugin-prerender';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // SEO: Define all routes that should be pre-rendered for crawlers
    const routesToPrerender = [
      '/',
      '/products/ai-job-kit'
      // Add future product slugs here manually or link to a data mapper
    ];

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Pre-rendering configuration
        prerender({
          staticDir: path.join(__dirname, 'dist'),
          routes: routesToPrerender,
          // Optional: wait until specific element is rendered, but 500ms usually enough
          postProcess(renderedRoute) {
            renderedRoute.html = renderedRoute.html.replace(
              /content="([^">]*)"/g,
              (match) => match
            );
            return renderedRoute;
          },
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
