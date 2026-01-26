/**
 * App Entry Point
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { subscribeToAuthState } from '@/features/auth/services/authService';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { Layout } from '@/shared/components/Layout';
import { strings } from '@/shared/localization/strings';
import '@/styles/global.css';

export function App() {
    const { isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        const unsubscribe = subscribeToAuthState();
        return unsubscribe;
    }, []);

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

    // Authenticated - show main app
    return (
        <Layout>
            <CanvasPlaceholder />
        </Layout>
    );
}

/**
 * Temporary placeholder until canvas is implemented
 */
function CanvasPlaceholder() {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--color-text-muted)',
            }}
        >
            <p>{strings.canvas.promptPlaceholder}</p>
        </div>
    );
}

export default App;
