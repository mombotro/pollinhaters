import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pollinators/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
