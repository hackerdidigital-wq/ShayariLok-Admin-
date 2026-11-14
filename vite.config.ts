import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function copyStandalonePublicPages(): Plugin {
  const cleanDirRoutes: Record<string, string> = {
    '/privacy-policy': 'public/privacy-policy/index.html',
    '/privacy-policy/': 'public/privacy-policy/index.html',
    '/terms': 'public/terms/index.html',
    '/terms/': 'public/terms/index.html',
    '/about': 'public/about/index.html',
    '/about/': 'public/about/index.html',
    '/contact': 'public/contact/index.html',
    '/contact/': 'public/contact/index.html',
  };

  return {
    name: 'copy-standalone-public-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = (req.url || '').split('?')[0];
        const relFile = cleanDirRoutes[rawUrl];
        if (relFile) {
          const filePath = path.resolve(__dirname, relFile);
          if (fs.existsSync(filePath)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(fs.readFileSync(filePath, 'utf-8'));
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(outDir)) return;
      for (const fileName of [
        'website.html',
        'privacy.html',
        'terms.html',
        'about.html',
        'contact.html',
        'config.json',
      ]) {
        const src = path.resolve(__dirname, fileName);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(outDir, fileName));
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), copyStandalonePublicPages()],
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
