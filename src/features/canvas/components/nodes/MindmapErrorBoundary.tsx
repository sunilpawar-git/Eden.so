/**
 * MindmapErrorBoundary — Catches rendering errors inside MindmapRenderer
 * and shows a graceful fallback instead of crashing the parent node/overlay.
 *
 * Uses React class-based error boundary (required by React API).
 * Reports errors to Sentry via captureError.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import styles from './MindmapErrorBoundary.module.css';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; }

export class MindmapErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error): void {
        captureError(error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.fallback} data-testid="mindmap-error-fallback">
                    {strings.canvas.mindmap.errorFallback}
                </div>
            );
        }
        return this.props.children;
    }
}
