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
import { useWorkspaceLoader } from '@/features/workspace/hooks/useWorkspaceLoader';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { strings } from '@/shared/localization/strings';
import '@/styles/global.css';

function AuthenticatedApp() {
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const { isLoading: workspaceLoading } = useWorkspaceLoader(currentWorkspaceId ?? '');
    useKeyboardShortcuts();
    useAutosave(currentWorkspaceId ?? '');

    if (workspaceLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>{strings.common.loading}</p>
            </div>
        );
    }

    return (
        <ReactFlowProvider>
            <Layout>
                <CanvasView />
            </Layout>
        </ReactFlowProvider>
    );
}

function AppContent() {
    const { isAuthenticated, isLoading: authLoading } = useAuthStore();

    // Auth loading state
    if (authLoading) {
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

    // Authenticated - show app with workspace loading
    return <AuthenticatedApp />;
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
