/**
 * UsageMeter tests — verifies progress bar rendering and accessibility.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageMeter } from '../UsageMeter';

describe('UsageMeter', () => {
    it('renders label and counts', () => {
        render(<UsageMeter current={3} max={5} label="Workspaces" />);
        expect(screen.getByText('Workspaces')).toBeInTheDocument();
        expect(screen.getByText('3/5')).toBeInTheDocument();
    });

    it('sets aria-valuenow and aria-valuemax', () => {
        render(<UsageMeter current={8} max={12} label="Nodes" />);
        const bar = screen.getByRole('progressbar');
        expect(bar).toHaveAttribute('aria-valuenow', '8');
        expect(bar).toHaveAttribute('aria-valuemax', '12');
        expect(bar).toHaveAttribute('aria-label', 'Nodes');
    });

    it('handles infinite max gracefully', () => {
        render(<UsageMeter current={50} max={Infinity} label="Storage" />);
        expect(screen.getByText('50/∞')).toBeInTheDocument();
        const bar = screen.getByRole('progressbar');
        expect(bar).not.toHaveAttribute('aria-valuemax');
    });

    it('caps percentage at 100%', () => {
        const { container } = render(<UsageMeter current={15} max={12} label="Nodes" />);
        const fill = container.querySelector('[class*="h-full"]');
        expect(fill).toHaveStyle({ width: '100%' });
    });

    it('applies warning color at 80% threshold', () => {
        const { container } = render(<UsageMeter current={10} max={12} label="Nodes" />);
        const fill = container.querySelector('[class*="h-full"]');
        expect(fill).toHaveStyle({ background: 'var(--color-warning)' });
    });

    it('applies primary color below threshold', () => {
        const { container } = render(<UsageMeter current={5} max={12} label="Nodes" />);
        const fill = container.querySelector('[class*="h-full"]');
        expect(fill).toHaveStyle({ background: 'var(--color-primary)' });
    });
});
