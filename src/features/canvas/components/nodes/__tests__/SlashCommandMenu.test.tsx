/**
 * SlashCommandMenu Component Tests
 * Tests for slash command dropdown menu with filtering and keyboard navigation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SlashCommandMenu } from '../SlashCommandMenu';
import { strings } from '@/shared/localization/strings';

// Test fixtures
const mockOnSelect = vi.fn();
const mockOnClose = vi.fn();
const mockAnchorRect: DOMRect = {
    top: 100, left: 200, width: 300, height: 24,
    bottom: 124, right: 500, x: 200, y: 100,
    toJSON: () => ({}),
};

/** Helper to render SlashCommandMenu with defaults */
function renderMenu(query = '') {
    return render(
        <SlashCommandMenu
            query={query}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
            anchorRect={mockAnchorRect}
        />
    );
}

describe('SlashCommandMenu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    describe('Basic Rendering', () => {
        it('should render menu with commands', () => {
            renderMenu();
            expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        it('should render ai-generate command with icon and label', () => {
            renderMenu();
            expect(screen.getByText('✨')).toBeInTheDocument();
            expect(screen.getByText(strings.slashCommands.aiGenerate.label)).toBeInTheDocument();
        });

        it('should render command description', () => {
            renderMenu();
            expect(screen.getByText(strings.slashCommands.aiGenerate.description)).toBeInTheDocument();
        });
    });

    describe('Portal Rendering', () => {
        it('should render menu in document.body via portal', () => {
            renderMenu();
            const portalMenu = document.querySelector('[data-testid="slash-command-menu"]');
            expect(portalMenu).toBeInTheDocument();
            expect(portalMenu?.parentElement).toBe(document.body);
        });

        it('should position menu based on anchor rect', () => {
            renderMenu();
            const menu = document.querySelector('[data-testid="slash-command-menu"]') as HTMLElement;
            expect(menu.style.top).toBe('124px'); // bottom of anchor
            expect(menu.style.left).toBe('200px'); // left of anchor
        });
    });

    describe('Filtering', () => {
        it('should show all commands for empty query', () => {
            renderMenu('');
            expect(screen.getByText(strings.slashCommands.aiGenerate.label)).toBeInTheDocument();
        });

        it('should filter commands by query "ai"', () => {
            renderMenu('ai');
            expect(screen.getByText(strings.slashCommands.aiGenerate.label)).toBeInTheDocument();
        });

        it('should show no results message for non-matching query', () => {
            renderMenu('xyz123');
            expect(screen.getByText(strings.slashCommands.noResults)).toBeInTheDocument();
        });
    });

    describe('Selection', () => {
        it('should call onSelect when command is clicked', () => {
            renderMenu();
            fireEvent.click(screen.getByRole('menuitem'));
            expect(mockOnSelect).toHaveBeenCalledWith('ai-generate');
        });

        it('should highlight first command by default', () => {
            renderMenu();
            expect(screen.getByRole('menuitem')).toHaveAttribute('data-highlighted', 'true');
        });
    });

    describe('Keyboard Navigation', () => {
        it('should select highlighted command on Enter', () => {
            renderMenu();
            fireEvent.keyDown(document, { key: 'Enter' });
            expect(mockOnSelect).toHaveBeenCalledWith('ai-generate');
        });

        it('should close menu on Escape', () => {
            renderMenu();
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should navigate down with ArrowDown', () => {
            renderMenu();
            fireEvent.keyDown(document, { key: 'ArrowDown' });
            expect(screen.getByRole('menuitem')).toHaveAttribute('data-highlighted', 'true');
        });

        it('should navigate up with ArrowUp', () => {
            renderMenu();
            fireEvent.keyDown(document, { key: 'ArrowUp' });
            expect(screen.getByRole('menuitem')).toHaveAttribute('data-highlighted', 'true');
        });
    });

    describe('Click Outside', () => {
        it('should close menu when clicking outside', () => {
            renderMenu();
            fireEvent.mouseDown(document.body);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should NOT close menu when clicking inside', () => {
            renderMenu();
            const menu = document.querySelector('[data-testid="slash-command-menu"]');
            fireEvent.mouseDown(menu as Element);
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('should have menu role', () => {
            renderMenu();
            expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        it('should have menuitem role on commands', () => {
            renderMenu();
            expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
        });

        it('should have aria-label for menu', () => {
            renderMenu();
            expect(screen.getByRole('menu')).toHaveAttribute('aria-label', strings.slashCommands.menuLabel);
        });
    });
});
