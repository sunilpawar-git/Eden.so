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
});
