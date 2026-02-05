/**
 * LoadingFallback Tests
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingFallback } from '../LoadingFallback';
import { strings } from '@/shared/localization/strings';

describe('LoadingFallback', () => {
    it('renders with default message', () => {
        render(<LoadingFallback />);
        
        expect(screen.getByText(strings.common.loadingComponent)).toBeInTheDocument();
    });

    it('renders with custom message', () => {
        const customMessage = 'Loading settings...';
        render(<LoadingFallback message={customMessage} />);
        
        expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('renders spinner element', () => {
        const { container } = render(<LoadingFallback />);
        
        // Check for spinner by class
        const spinner = container.querySelector('[class*="spinner"]');
        expect(spinner).toBeInTheDocument();
    });

    it('applies fullScreen class when fullScreen prop is true', () => {
        const { container } = render(<LoadingFallback fullScreen />);
        
        const containerEl = container.querySelector('[class*="fullScreen"]');
        expect(containerEl).toBeInTheDocument();
    });

    it('does not apply fullScreen class by default', () => {
        const { container } = render(<LoadingFallback />);
        
        const containerEl = container.querySelector('[class*="fullScreen"]');
        expect(containerEl).not.toBeInTheDocument();
    });
});
