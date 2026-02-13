/**
 * App Entry Point
 * Uses React.lazy for code splitting of non-critical components
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { subscribeToAuthState } from '@/features/auth/services/authService';
import { Layout } from '@/shared/components/Layout';
import { CanvasView } from '@/features/canvas/components/CanvasView';
import { KeyboardShortcutsProvider } from '@/features/canvas/components/KeyboardShortcutsProvider';
import { ToastContainer } from '@/shared/components/Toast';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { SwUpdatePrompt } from '@/shared/components/SwUpdatePrompt';
import { OfflineFallback } from '@/shared/components/OfflineFallback';
import { useThemeApplicator } from '@/shared/hooks/useThemeApplicator';
import { useCompactMode } from '@/shared/hooks/useCompactMode';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useQueueDrainer } from '@/shared/hooks/useQueueDrainer';
import { useSwRegistration } from '@/shared/hooks/useSwRegistration';
import { useAutosave } from '@/features/workspace/hooks/useAutosave';
import { useWorkspaceLoader } from '@/features/workspace/hooks/useWorkspaceLoader';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { usePinnedWorkspaceStore } from '@/features/workspace/stores/pinnedWorkspaceStore';
import { useSubscriptionStore } from '@/features/subscription/stores/subscriptionStore';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { strings } from '@/shared/localization/strings';
import '@/styles/global.css';

// Lazy load non-critical components for better initial load performance
const LoginPage = lazy(() => 
    import('@/features/auth/components/LoginPage').then(m => ({ default: m.LoginPage }))
);
const SettingsPanel = lazy(() => 
    import('@/shared/components/SettingsPanel').then(m => ({ default: m.SettingsPanel }))
);

function AuthenticatedApp() {
    const { user } = useAuthStore();
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const isOnline = useNetworkStatusStore((s) => s.isOnline);
    const {
        isLoading: initialLoading,
        error: loadError,
        hasOfflineData,
    } = useWorkspaceLoader(currentWorkspaceId ?? '');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    useThemeApplicator();
    useCompactMode();
    useNetworkStatus();
    useQueueDrainer();
    useAutosave(currentWorkspaceId ?? '');

    // Initialize pinned workspace and subscription stores on login
    useEffect(() => {
        if (user) {
            void usePinnedWorkspaceStore.getState().loadPinnedIds();
            void useSubscriptionStore.getState().loadSubscription(user.id);
        }
    }, [user]);

    // Show offline fallback when offline with a load error and no cached data
    if (!isOnline && loadError && !hasOfflineData) {
        return (
            <OfflineFallback
                hasOfflineData={false}
                onRetry={() => window.location.reload()}
            />
        );
    }

    // Always keep ReactFlowProvider mounted to prevent blink on workspace switch
    return (
        <ReactFlowProvider>
            <KeyboardShortcutsProvider 
                onOpenSettings={() => setIsSettingsOpen(true)} 
            />
            <Layout onSettingsClick={() => setIsSettingsOpen(true)}>
                <CanvasView />
                {initialLoading && (
                    <div className="canvas-loading-overlay">
                        <div className="loading-spinner" />
                        <p>{strings.common.loading}</p>
                    </div>
                )}
            </Layout>
            <Suspense fallback={null}>
                <SettingsPanel 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)} 
                />
            </Suspense>
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

    // Not authenticated - lazy load login page
    if (!isAuthenticated) {
        return (
            <Suspense fallback={<LoadingFallback fullScreen />}>
                <LoginPage />
            </Suspense>
        );
    }

    // Authenticated - show app with workspace loading
    return <AuthenticatedApp />;
}

export function App() {
    const swRegistration = useSwRegistration();

    useEffect(() => {
        const unsubscribe = subscribeToAuthState();
        return unsubscribe;
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <AppContent />
                <ToastContainer />
                <SwUpdatePrompt registration={swRegistration} />
            </ErrorBoundary>
        </QueryClientProvider>
    );
}

export default App;
