/**
 * NodeUtilsBar Duplicate button tests
 * Duplicate is a secondary action — lives in the overflow menu.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

const openOverflow = () => fireEvent.click(screen.getByLabelText('More actions'));

describe('NodeUtilsBar — Duplicate button', () => {
    const baseProps = {
        onTagClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
    };

    it('renders Duplicate in overflow when onDuplicateClick is provided', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} />);
        openOverflow();
        expect(screen.getByLabelText('Duplicate')).toBeInTheDocument();
    });

    it('does not render Duplicate in overflow when onDuplicateClick is not provided', () => {
        render(<NodeUtilsBar {...baseProps} />);
        openOverflow();
        expect(screen.queryByLabelText('Duplicate')).not.toBeInTheDocument();
    });

    it('calls onDuplicateClick handler on click', () => {
        const handler = vi.fn();
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={handler} />);
        openOverflow();
        fireEvent.click(screen.getByLabelText('Duplicate'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('disables overflow trigger when disabled prop is true', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} disabled />);
        expect(screen.getByLabelText('More actions')).toBeDisabled();
    });

    it('shows correct icon in overflow item', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} />);
        openOverflow();
        const item = screen.getByLabelText('Duplicate');
        expect(item.textContent).toContain('📑');
    });
});
