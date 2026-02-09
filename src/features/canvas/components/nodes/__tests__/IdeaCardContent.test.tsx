/**
 * Tests for IdeaCardContent sub-components
 * TDD: Validates content rendering and interaction for each view state
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    EditingContent,
    GeneratingContent,
    AICardContent,
    SimpleCardContent,
    PlaceholderContent,
} from '../IdeaCardContent';

// Mock TipTapEditor to avoid ProseMirror DOM complexity in tests
vi.mock('../TipTapEditor', () => ({
    TipTapEditor: ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
        <div data-testid={testId ?? 'tiptap-editor'} role="textbox" />
    ),
}));

describe('IdeaCardContent sub-components', () => {
    describe('EditingContent', () => {
        it('should render TipTapEditor', () => {
            render(<EditingContent editor={null} />);
            expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
        });
    });

    describe('GeneratingContent', () => {
        it('should render generating indicator', () => {
            render(<GeneratingContent />);
            expect(screen.getByText(/generating/i)).toBeInTheDocument();
        });
    });

    describe('AICardContent', () => {
        const defaultProps = {
            prompt: 'Test prompt',
            editor: null,
            onDoubleClick: vi.fn(),
        };

        it('should render prompt text', () => {
            render(<AICardContent {...defaultProps} />);
            expect(screen.getByText('Test prompt')).toBeInTheDocument();
        });

        it('should render AI divider', () => {
            render(<AICardContent {...defaultProps} />);
            expect(screen.getByTestId('ai-divider')).toBeInTheDocument();
        });

        it('should render TipTapEditor for output', () => {
            render(<AICardContent {...defaultProps} />);
            expect(screen.getByTestId('view-editor')).toBeInTheDocument();
        });

        it('should call onDoubleClick on prompt double-click', () => {
            const onDoubleClick = vi.fn();
            render(<AICardContent {...defaultProps} onDoubleClick={onDoubleClick} />);

            fireEvent.doubleClick(screen.getByText('Test prompt'));
            expect(onDoubleClick).toHaveBeenCalled();
        });
    });

    describe('SimpleCardContent', () => {
        const defaultProps = {
            editor: null,
            onDoubleClick: vi.fn(),
        };

        it('should call onDoubleClick on double-click', () => {
            const onDoubleClick = vi.fn();
            render(<SimpleCardContent {...defaultProps} onDoubleClick={onDoubleClick} />);

            const content = screen.getByRole('button');
            fireEvent.doubleClick(content);
            expect(onDoubleClick).toHaveBeenCalled();
        });
    });

    describe('PlaceholderContent', () => {
        const defaultProps = {
            onDoubleClick: vi.fn(),
        };

        it('should render placeholder text', () => {
            render(<PlaceholderContent {...defaultProps} />);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should call onDoubleClick on double-click', () => {
            const onDoubleClick = vi.fn();
            render(<PlaceholderContent {...defaultProps} onDoubleClick={onDoubleClick} />);

            fireEvent.doubleClick(screen.getByRole('button'));
            expect(onDoubleClick).toHaveBeenCalled();
        });
    });
});
