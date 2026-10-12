import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { pwaPlugin } from './scripts/pwaPlugin';

export default defineConfig({
  plugins: [react(), pwaPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
