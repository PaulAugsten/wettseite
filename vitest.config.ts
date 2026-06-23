import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        include: ['**/*.test.{ts,tsx}'],
        exclude: ['node_modules', '.next', 'e2e'],
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            provider: 'v8',
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
