/**
 * NodeUtilsBar Duplicate button tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

describe('NodeUtilsBar — Duplicate button', () => {
    const baseProps = {
        onTagClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
    };

    it('renders Duplicate button when onDuplicateClick is provided', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} />);
        expect(screen.getByLabelText('Duplicate')).toBeInTheDocument();
    });

    it('does not render Duplicate button when onDuplicateClick is not provided', () => {
        render(<NodeUtilsBar {...baseProps} />);
        expect(screen.queryByLabelText('Duplicate')).not.toBeInTheDocument();
    });

    it('calls onDuplicateClick handler on click', () => {
        const handler = vi.fn();
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={handler} />);
        fireEvent.click(screen.getByLabelText('Duplicate'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('disables Duplicate button when disabled prop is true', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} disabled />);
        expect(screen.getByLabelText('Duplicate')).toBeDisabled();
    });

    it('shows correct icon', () => {
        render(<NodeUtilsBar {...baseProps} onDuplicateClick={vi.fn()} />);
        expect(screen.getByLabelText('Duplicate').textContent).toContain('📑');
    });
});
