/**
 * NodeUtilsBar Tests - TDD red phase
 * Tests for the floating node utilities action bar
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

describe('NodeUtilsBar', () => {
    const defaultProps = {
        onTagClick: vi.fn(),
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
        disabled: false,
    };

    it('renders all four action buttons', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        expect(screen.getByLabelText('Tags')).toBeInTheDocument();
        expect(screen.getByLabelText('AI Actions')).toBeInTheDocument();
        expect(screen.getByLabelText('Connect')).toBeInTheDocument();
        expect(screen.getByLabelText('Delete')).toBeInTheDocument();
    });

    it('calls onTagClick when Tags button is clicked', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        fireEvent.click(screen.getByLabelText('Tags'));
        expect(defaultProps.onTagClick).toHaveBeenCalledTimes(1);
    });

    it('calls onAIClick when AI Actions button is clicked', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        fireEvent.click(screen.getByLabelText('AI Actions'));
        expect(defaultProps.onAIClick).toHaveBeenCalledTimes(1);
    });

    it('calls onConnectClick when Connect button is clicked', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        fireEvent.click(screen.getByLabelText('Connect'));
        expect(defaultProps.onConnectClick).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when Delete button is clicked', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        fireEvent.click(screen.getByLabelText('Delete'));
        expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
    });

    it('disables all buttons when disabled prop is true', () => {
        render(<NodeUtilsBar {...defaultProps} disabled={true} />);

        expect(screen.getByLabelText('Tags')).toBeDisabled();
        expect(screen.getByLabelText('AI Actions')).toBeDisabled();
        expect(screen.getByLabelText('Connect')).toBeDisabled();
        expect(screen.getByLabelText('Delete')).toBeDisabled();
    });

    describe('Copy button', () => {
        it('renders copy button when onCopyClick is provided', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} />);
            expect(screen.getByLabelText('Copy')).toBeInTheDocument();
        });

        it('does not render copy button when onCopyClick is not provided', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.queryByLabelText('Copy')).not.toBeInTheDocument();
        });

        it('calls onCopyClick when Copy button is clicked', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} hasContent={true} />);
            fireEvent.click(screen.getByLabelText('Copy'));
            expect(onCopyClick).toHaveBeenCalledTimes(1);
        });

        it('disables copy button when disabled prop is true', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} disabled={true} />);
            expect(screen.getByLabelText('Copy')).toBeDisabled();
        });

        it('disables copy button when hasContent is false', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} hasContent={false} />);
            expect(screen.getByLabelText('Copy')).toBeDisabled();
        });

        it('enables copy button when hasContent is true', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} hasContent={true} />);
            expect(screen.getByLabelText('Copy')).toBeEnabled();
        });

        it('does not call onCopyClick when copy button is disabled', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} hasContent={false} />);
            fireEvent.click(screen.getByLabelText('Copy'));
            expect(onCopyClick).not.toHaveBeenCalled();
        });
    });
});
