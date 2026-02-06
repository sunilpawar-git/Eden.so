/**
 * Tests for ErrorBoundary component
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock CSS module
vi.mock('../ErrorBoundary.module.css', () => ({
    default: {
        errorContainer: 'errorContainer',
        errorCard: 'errorCard',
        icon: 'icon',
        title: 'title',
        message: 'message',
        retryButton: 'retryButton',
    },
}));

// Mock strings
vi.mock('@/shared/localization/strings', () => ({
    strings: {
        errors: {
            generic: 'Something went wrong',
        },
        common: {
            retry: 'Try Again',
        },
    },
}));

// Component that throws an error
function ErrorThrower({ shouldThrow = true }: { shouldThrow?: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error message');
    }
    return <div>No error</div>;
}

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // Suppress console.error for cleaner test output
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('should render children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div>Child content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render error UI when child throws', () => {
        render(
            <ErrorBoundary>
                <ErrorThrower />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
        render(
            <ErrorBoundary fallback={<div>Custom error page</div>}>
                <ErrorThrower />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom error page')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should recover when retry button is clicked', () => {
        let shouldThrow = true;

        function ErrorThrowerWithToggle() {
            if (shouldThrow) {
                throw new Error('Test error');
            }
            return <div>Recovered content</div>;
        }

        const { rerender } = render(
            <ErrorBoundary>
                <ErrorThrowerWithToggle />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Fix the error and click retry
        shouldThrow = false;
        const retryButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(retryButton);

        // Force rerender to pick up new state
        rerender(
            <ErrorBoundary>
                <ErrorThrowerWithToggle />
            </ErrorBoundary>
        );

        expect(screen.getByText('Recovered content')).toBeInTheDocument();
    });

    it('should display error UI when error has no message', () => {
        function ErrorThrowerNoMessage(): React.ReactNode {
            throw new Error();
        }

        render(
            <ErrorBoundary>
                <ErrorThrowerNoMessage />
            </ErrorBoundary>
        );

        // Error with empty message still shows the error UI
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should log error to console', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <ErrorBoundary>
                <ErrorThrower />
            </ErrorBoundary>
        );

        expect(consoleSpy).toHaveBeenCalledWith(
            '[ErrorBoundary] Caught error:',
            expect.any(Error),
            expect.any(Object)
        );
    });
});
