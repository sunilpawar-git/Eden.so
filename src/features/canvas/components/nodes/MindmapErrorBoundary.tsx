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
                <div className="flex flex-col items-center justify-center w-full min-h-[80px]" style={{ gap: 8, padding: 16 }} data-testid="mindmap-error-fallback">
                    <p className="text-[var(--color-text-secondary)] text-[var(--font-size-sm)] italic">{strings.canvas.mindmap.errorFallback}</p>
                    <div className="flex" style={{ gap: 8 }}>
                        <button className="border border-[var(--color-border)] rounded-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] text-[var(--font-size-xs)] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-surface-hover)]" style={{ padding: '4px 8px' }} onClick={this.handleRetry}>
                            {strings.canvas.mindmap.errorRetry}
                        </button>
                        {this.props.onSwitchToText && (
                            <button className="border border-[var(--color-border)] rounded-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] text-[var(--font-size-xs)] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-surface-hover)]" style={{ padding: '4px 8px' }} onClick={this.handleSwitchToText}>
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
