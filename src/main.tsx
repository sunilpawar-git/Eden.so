/**
 * Application Entry Point
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initWebVitals } from '@/shared/services/performanceService';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element not found');
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);

// Initialize web vitals monitoring (non-blocking)
void initWebVitals();
