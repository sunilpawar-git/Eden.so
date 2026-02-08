/**
 * Tests for IdeaCardContent sub-components
 * TDD: Write tests FIRST before refactoring IdeaCard.tsx
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
import React from 'react';

describe('IdeaCardContent sub-components', () => {
    describe('EditingContent', () => {
        const defaultProps = {
            inputMode: 'note' as const,
            inputValue: 'test value',
            placeholder: 'Enter text...',
            isMenuOpen: false,
            isGenerating: false,
            query: '',
            textareaRef: { current: null } as React.RefObject<HTMLTextAreaElement>,
            onInputChange: vi.fn(),
            onBlur: vi.fn(),
            onKeyDown: vi.fn(),
            onCommandSelect: vi.fn(),
            onMenuClose: vi.fn(),
        };

        it('should render textarea with correct value', () => {
            render(<EditingContent {...defaultProps} />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveValue('test value');
        });

        it('should render textarea with provided placeholder', () => {
            render(<EditingContent {...defaultProps} placeholder="Type something..." />);
            expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Type something...');
        });

        it('should render textarea in disabled state when generating', () => {
            render(<EditingContent {...defaultProps} isGenerating={true} />);
            expect(screen.getByRole('textbox')).toBeDisabled();
        });

        it('should call onInputChange when typing', () => {
            const onInputChange = vi.fn();
            render(<EditingContent {...defaultProps} onInputChange={onInputChange} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'new value' } });

            expect(onInputChange).toHaveBeenCalledWith('new value');
        });

        it('should disable textarea when generating', () => {
            render(<EditingContent {...defaultProps} isGenerating={true} />);
            expect(screen.getByRole('textbox')).toBeDisabled();
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
            output: 'Test output',
            onDoubleClick: vi.fn(),
            onKeyDown: vi.fn(),
        };

        it('should render prompt text', () => {
            render(<AICardContent {...defaultProps} />);
            expect(screen.getByText('Test prompt')).toBeInTheDocument();
        });

        it('should render AI divider', () => {
            render(<AICardContent {...defaultProps} />);
            expect(screen.getByTestId('ai-divider')).toBeInTheDocument();
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
            output: 'Simple content',
            onDoubleClick: vi.fn(),
            onKeyDown: vi.fn(),
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
            onKeyDown: vi.fn(),
        };

        it('should render placeholder text', () => {
            render(<PlaceholderContent {...defaultProps} />);
            // Placeholder text comes from strings
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
