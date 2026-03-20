/**
 * NodeHoverMenu Tests — TDD for flat 5-action bar.
 * Primary: AI/Transform | Connect | Copy | Delete | More
 * All labels from string resources. React.memo applied.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import { NodeHoverMenu } from '../NodeHoverMenu';

describe('NodeHoverMenu', () => {
    const defaultProps = {
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onCopyClick: vi.fn(),
        onDelete: vi.fn(),
        onMoreClick: vi.fn(),
        hasContent: true,
        disabled: false,
    };

    describe('renders 5 buttons', () => {
        it('renders Connect button', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeInTheDocument();
        });

        it('renders Copy button', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeInTheDocument();
        });

        it('renders Delete button', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeInTheDocument();
        });

        it('renders More button', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.more)).toBeInTheDocument();
        });
    });

    describe('button callbacks', () => {
        it('calls onConnectClick when Connect is clicked', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            fireEvent.click(screen.getByLabelText(strings.nodeUtils.connect));
            expect(defaultProps.onConnectClick).toHaveBeenCalledOnce();
        });

        it('calls onCopyClick when Copy is clicked', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            fireEvent.click(screen.getByLabelText(strings.nodeUtils.copy));
            expect(defaultProps.onCopyClick).toHaveBeenCalledOnce();
        });

        it('calls onDelete when Delete is clicked', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            fireEvent.click(screen.getByLabelText(strings.nodeUtils.delete));
            expect(defaultProps.onDelete).toHaveBeenCalledOnce();
        });

        it('calls onMoreClick when More is clicked', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            fireEvent.click(screen.getByLabelText(strings.nodeUtils.more));
            expect(defaultProps.onMoreClick).toHaveBeenCalledOnce();
        });
    });

    describe('Copy button state', () => {
        it('disables Copy when hasContent is false', () => {
            render(<NodeHoverMenu {...defaultProps} hasContent={false} />);
            expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeDisabled();
        });

        it('enables Copy when hasContent is true', () => {
            render(<NodeHoverMenu {...defaultProps} hasContent={true} />);
            expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeEnabled();
        });
    });

    describe('disabled state', () => {
        it('disables all buttons when disabled prop is true', () => {
            render(<NodeHoverMenu {...defaultProps} disabled={true} />);
            expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeDisabled();
            expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeDisabled();
            expect(screen.getByLabelText(strings.nodeUtils.more)).toBeDisabled();
        });
    });

    describe('a11y', () => {
        it('has role="toolbar" and aria-label', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            const toolbar = screen.getByRole('toolbar');
            expect(toolbar).toHaveAttribute('aria-label', strings.canvas.nodeActionsLabel);
        });

        it('More button has aria-haspopup="true"', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.more)).toHaveAttribute('aria-haspopup', 'true');
        });
    });

    describe('all labels from string resources', () => {
        it('labels are from strings.nodeUtils', () => {
            render(<NodeHoverMenu {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.nodeUtils.more)).toBeInTheDocument();
        });
    });

    describe('React.memo applied', () => {
        it('NodeHoverMenu is memoized', () => {
            expect(NodeHoverMenu.$$typeof).toBe(Symbol.for('react.memo'));
        });
    });
});
