/**
 * InlineSlashMenu Tests - TDD
 * Tests for the inline slash command menu that renders inside the card
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineSlashMenu } from '../InlineSlashMenu';

describe('InlineSlashMenu', () => {
    const defaultProps = {
        query: '',
        onSelect: vi.fn(),
        onClose: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render the menu with role="menu"', () => {
            render(<InlineSlashMenu {...defaultProps} />);
            expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        it('should render inside the DOM (no portal)', () => {
            const { container } = render(
                <div data-testid="parent">
                    <InlineSlashMenu {...defaultProps} />
                </div>
            );
            const parent = container.querySelector('[data-testid="parent"]');
            const menu = screen.getByRole('menu');
            expect(parent?.contains(menu)).toBe(true);
        });

        it('should render all commands when query is empty', () => {
            render(<InlineSlashMenu {...defaultProps} />);
            const items = screen.getAllByRole('menuitem');
            expect(items.length).toBeGreaterThan(0);
        });

        it('should show "no results" for unmatched query', () => {
            render(<InlineSlashMenu {...defaultProps} query="xyz123" />);
            expect(screen.getByText('No commands found')).toBeInTheDocument();
        });

        it('should display command icon and label', () => {
            render(<InlineSlashMenu {...defaultProps} />);
            expect(screen.getByText('✨')).toBeInTheDocument();
            expect(screen.getByText('AI Generate')).toBeInTheDocument();
        });

        it('should display command description', () => {
            render(<InlineSlashMenu {...defaultProps} />);
            expect(screen.getByText('Generate content with AI')).toBeInTheDocument();
        });

        it('should display command prefix hint', () => {
            render(<InlineSlashMenu {...defaultProps} />);
            expect(screen.getByText('/ai:')).toBeInTheDocument();
        });
    });

    describe('Filtering', () => {
        it('should filter commands by query "ai"', () => {
            render(<InlineSlashMenu {...defaultProps} query="ai" />);
            const items = screen.getAllByRole('menuitem');
            expect(items.length).toBe(1);
        });

        it('should filter commands by query "gen"', () => {
            render(<InlineSlashMenu {...defaultProps} query="gen" />);
            const items = screen.getAllByRole('menuitem');
            expect(items.length).toBe(1);
        });
    });

    describe('Selection', () => {
        it('should call onSelect when command is clicked', () => {
            const onSelect = vi.fn();
            render(<InlineSlashMenu {...defaultProps} onSelect={onSelect} />);
            
            const item = screen.getByRole('menuitem');
            fireEvent.click(item);
            
            expect(onSelect).toHaveBeenCalledWith('ai-generate');
        });
    });

    describe('Keyboard Navigation', () => {
        it('should highlight first item by default', () => {
            render(<InlineSlashMenu {...defaultProps} />);
            const item = screen.getByRole('menuitem');
            expect(item.dataset.highlighted).toBe('true');
        });

        it('should call onSelect on Enter key', () => {
            const onSelect = vi.fn();
            render(<InlineSlashMenu {...defaultProps} onSelect={onSelect} />);
            
            fireEvent.keyDown(document, { key: 'Enter' });
            
            expect(onSelect).toHaveBeenCalledWith('ai-generate');
        });

        it('should call onClose on Escape key', () => {
            const onClose = vi.fn();
            render(<InlineSlashMenu {...defaultProps} onClose={onClose} />);
            
            fireEvent.keyDown(document, { key: 'Escape' });
            
            expect(onClose).toHaveBeenCalled();
        });
    });
});
