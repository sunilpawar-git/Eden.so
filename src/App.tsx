/**
 * App Entry Point
 */
import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { subscribeToAuthState } from '@/features/auth/services/authService';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { Layout } from '@/shared/components/Layout';
import { CanvasView } from '@/features/canvas/components/CanvasView';
import { ToastContainer } from '@/shared/components/Toast';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { useAutosave } from '@/features/workspace/hooks/useAutosave';
import { strings } from '@/shared/localization/strings';
import '@/styles/global.css';

function AppContent() {
    const { isAuthenticated, isLoading } = useAuthStore();
    useKeyboardShortcuts();
    useAutosave('default-workspace'); // TODO: Get from workspace store

    // Loading state
    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>{strings.common.loading}</p>
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Authenticated - show main app with canvas
    return (
        <ReactFlowProvider>
            <Layout>
                <CanvasView />
            </Layout>
        </ReactFlowProvider>
    );
}

export function App() {
    useEffect(() => {
        const unsubscribe = subscribeToAuthState();
        return unsubscribe;
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <AppContent />
                <ToastContainer />
            </ErrorBoundary>
        </QueryClientProvider>
    );
}

export default App;
