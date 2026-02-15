import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'


export default defineConfig(({ command }) => ({
    base: command === 'serve' ? './' : '/Site-Soluto/FinFlow/',
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
    },
    plugins: [
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        proxy: {
            '/Site-Soluto/FinFlow/api': {
                target: 'https://solutotecnologia.com.br',
                changeOrigin: true,
                secure: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                }
            }
        }
    }
}))
