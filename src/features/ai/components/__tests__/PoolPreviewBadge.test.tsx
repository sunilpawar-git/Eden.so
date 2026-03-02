/**
 * PoolPreviewBadge Tests — Badge count and visibility
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PoolPreviewBadge } from '../PoolPreviewBadge';
import { strings } from '@/shared/localization/strings';

describe('PoolPreviewBadge', () => {
    it('renders nothing when pooledCount is 0', () => {
        const { container } = render(<PoolPreviewBadge pooledCount={0} totalCount={10} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders count when pooledCount > 0', () => {
        render(<PoolPreviewBadge pooledCount={8} totalCount={20} />);
        expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('has correct aria-label with pool preview text', () => {
        render(<PoolPreviewBadge pooledCount={5} totalCount={15} />);
        const badge = screen.getByLabelText(strings.nodePool.poolPreview(5, 15));
        expect(badge).toBeInTheDocument();
    });

    it('has correct title tooltip', () => {
        render(<PoolPreviewBadge pooledCount={3} totalCount={10} />);
        const badge = screen.getByTitle(strings.nodePool.poolPreview(3, 10));
        expect(badge).toBeInTheDocument();
    });
});
