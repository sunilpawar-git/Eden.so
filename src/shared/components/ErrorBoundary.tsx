/**
 * Error Boundary - Graceful error handling
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { strings } from '@/shared/localization/strings';
import styles from './ErrorBoundary.module.css';

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
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        // TODO: Send to error reporting service
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- fallback is ReactNode|undefined
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={styles.errorContainer}>
                    <div className={styles.errorCard}>
                        <div className={styles.icon}>⚠️</div>
                        <h2 className={styles.title}>{strings.errors.generic}</h2>
                        <p className={styles.message}>
                            {this.state.error?.message ?? 'An unexpected error occurred'}
                        </p>
                        <button className={styles.retryButton} onClick={this.handleRetry}>
                            {strings.common.retry}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
