/**
 * TipTapEditor Component Tests
 * TDD: Validates the thin wrapper around TipTap's EditorContent
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TipTapEditor } from '../TipTapEditor';

describe('TipTapEditor', () => {
    it('renders with data-testid when provided', () => {
        render(<TipTapEditor editor={null} data-testid="test-editor" />);
        expect(screen.getByTestId('test-editor')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<TipTapEditor editor={null} className="custom-class" data-testid="styled-editor" />);
        const wrapper = screen.getByTestId('styled-editor');
        expect(wrapper.className).toContain('custom-class');
    });

    it('renders without editor instance (null state)', () => {
        render(<TipTapEditor editor={null} data-testid="null-editor" />);
        expect(screen.getByTestId('null-editor')).toBeInTheDocument();
    });
});
