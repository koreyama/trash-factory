import { defineConfig } from 'vite';

export default defineConfig({
    // Use relative paths for local/Electron, or set VITE_BASE for GitHub Pages
    base: process.env.VITE_BASE || './',
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
});
