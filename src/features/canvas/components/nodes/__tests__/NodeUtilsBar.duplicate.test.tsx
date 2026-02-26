/**
 * NodeUtilsBar Duplicate button tests
 * Duplicate is now a direct deck 2 button (not in overflow).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

vi.mock('../../../../hooks/useUtilsBarLayout', () => ({
    useUtilsBarLayout: () => ({
        deckOneActions: ['ai', 'connect', 'copy', 'pin', 'delete'],
        deckTwoActions: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
    }),
}));

describe('NodeUtilsBar — Duplicate button', () => {
    const baseProps = {
        onTagClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
    };

    it('renders Duplicate directly when onDuplicateClick is provided', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} />);
        expect(screen.getByLabelText('Duplicate')).toBeInTheDocument();
    });

    it('does not render Duplicate when onDuplicateClick is not provided', () => {
        render(<NodeUtilsBar {...baseProps} />);
        expect(screen.queryByLabelText('Duplicate')).not.toBeInTheDocument();
    });

    it('calls onDuplicateClick handler on click', () => {
        const handler = vi.fn();
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={handler} />);
        fireEvent.click(screen.getByLabelText('Duplicate'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('disables Duplicate when disabled prop is true', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} disabled />);
        expect(screen.getByLabelText('Duplicate')).toBeDisabled();
    });

    it('shows correct icon', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} />);
        const item = screen.getByLabelText('Duplicate');
        expect(item.textContent).toContain('📑');
    });
});
