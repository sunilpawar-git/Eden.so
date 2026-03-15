/**
 * Error Boundary - Graceful error handling
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { strings } from '@/shared/localization/strings';
import { logger } from '@/shared/services/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('[ErrorBoundary] Caught error:', error, {
            componentStack: errorInfo.componentStack ?? '',
            errorStack: error.stack ?? '',
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback != null) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center min-h-screen p-[var(--space-xl)] bg-[var(--color-background)]">
                    <div className="text-center p-[var(--space-2xl)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] max-w-[400px]">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h2 className="text-[var(--font-size-xl)] font-semibold text-[var(--color-text-primary)] mb-2">{strings.errors.generic}</h2>
                        <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] mb-6">
                            {this.state.error?.message ?? 'An unexpected error occurred'}
                        </p>
                        <button className="py-2 px-[var(--space-xl)] bg-[var(--color-primary)] text-white rounded-md font-medium transition-colors duration-150 ease-in-out hover:bg-[var(--color-primary-hover)]" onClick={this.handleRetry}>
                            {strings.common.retry}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
