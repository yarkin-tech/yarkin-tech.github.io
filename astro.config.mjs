// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://yarkin-tech.github.io',
  base: '/',
  integrations: [sitemap()],
  build: { format: 'directory' },
});
