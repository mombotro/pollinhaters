import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pollinhaters/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
