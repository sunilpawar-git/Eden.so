/**
 * MindmapErrorBoundary — Catches rendering errors inside MindmapRenderer
 * and shows a graceful fallback with retry and switch-to-text options.
 *
 * Uses React class-based error boundary (required by React API).
 * Reports errors to Sentry via captureError.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import styles from './MindmapErrorBoundary.module.css';

interface Props {
    children: React.ReactNode;
    onSwitchToText?: () => void;
}
interface State { hasError: boolean; }

export class MindmapErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error): void {
        captureError(error);
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
    };

    private handleSwitchToText = () => {
        this.setState({ hasError: false });
        this.props.onSwitchToText?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.fallback} data-testid="mindmap-error-fallback">
                    <p className={styles.errorMessage}>{strings.canvas.mindmap.errorFallback}</p>
                    <div className={styles.errorActions}>
                        <button className={styles.retryButton} onClick={this.handleRetry}>
                            {strings.canvas.mindmap.errorRetry}
                        </button>
                        {this.props.onSwitchToText && (
                            <button className={styles.switchButton} onClick={this.handleSwitchToText}>
                                {strings.canvas.mindmap.errorSwitchToText}
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
