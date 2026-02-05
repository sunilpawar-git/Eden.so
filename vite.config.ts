import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // ReactFlow - largest dependency, separate chunk
                    if (id.includes('@xyflow')) {
                        return 'vendor-reactflow';
                    }
                    // Firebase - second largest, separate chunk
                    if (id.includes('firebase')) {
                        return 'vendor-firebase';
                    }
                    // State management libraries
                    if (id.includes('zustand') || id.includes('@tanstack')) {
                        return 'vendor-state';
                    }
                    // Core React runtime (grouped with other node_modules)
                    return undefined;
                },
            },
        },
        // Increase warning limit since we're intentionally chunking
        chunkSizeWarningLimit: 600,
    },
});
