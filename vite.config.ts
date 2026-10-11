import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/core/**/*.test.ts', 'src/editor/**/*.test.ts', 'src/storage/**/*.test.ts'],
  },
});
