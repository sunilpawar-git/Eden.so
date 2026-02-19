/**
 * SlashCommandList Tests
 * TDD: Validates the TipTap suggestion popup renderer
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlashCommandList, type SlashCommandListRef } from '../SlashCommandList';
import { slashCommands } from '../../../services/slashCommands';
import { strings } from '@/shared/localization/strings';

describe('SlashCommandList', () => {
    const defaultProps = {
        items: slashCommands,
        command: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders menu with items', () => {
            render(<SlashCommandList {...defaultProps} />);
            expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        it('renders each command as a menu item', () => {
            render(<SlashCommandList {...defaultProps} />);
            const items = screen.getAllByRole('menuitem');
            expect(items).toHaveLength(slashCommands.length);
        });

        it('shows resolved command label', () => {
            render(<SlashCommandList {...defaultProps} />);
            expect(screen.getByText(strings.slashCommands.aiGenerate.label)).toBeInTheDocument();
        });

        it('shows resolved command description', () => {
            render(<SlashCommandList {...defaultProps} />);
            expect(screen.getByText(strings.slashCommands.aiGenerate.description)).toBeInTheDocument();
        });

        it('shows no results message when items empty', () => {
            render(<SlashCommandList {...defaultProps} items={[]} />);
            expect(screen.getByText(strings.slashCommands.noResults)).toBeInTheDocument();
        });

        it('renders menu label from strings', () => {
            render(<SlashCommandList {...defaultProps} />);
            expect(screen.getByRole('menu')).toHaveAttribute(
                'aria-label', strings.slashCommands.menuLabel
            );
        });
    });

    describe('Click selection', () => {
        it('calls command with selected item on mousedown', () => {
            const command = vi.fn();
            render(<SlashCommandList {...defaultProps} command={command} />);

            const items = screen.getAllByRole('menuitem');
            fireEvent.mouseDown(items[0]!);
            expect(command).toHaveBeenCalledWith(slashCommands[0]);
        });
    });

    describe('Keyboard navigation via ref', () => {
        it('onKeyDown ArrowDown highlights next item', () => {
            const ref = { current: null as SlashCommandListRef | null };
            render(<SlashCommandList {...defaultProps} ref={ref} />);

            const items = screen.getAllByRole('menuitem');
            expect(items[0]).toHaveAttribute('data-highlighted', 'true');
        });

        it('onKeyDown Enter selects highlighted item', () => {
            const command = vi.fn();
            const ref = { current: null as SlashCommandListRef | null };
            render(<SlashCommandList {...defaultProps} command={command} ref={ref} />);

            // Simulate Enter via the ref
            const handled = ref.current?.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) });
            expect(handled).toBe(true);
            expect(command).toHaveBeenCalledWith(slashCommands[0]);
        });

        it('onKeyDown Escape is not handled (bubbles to TipTap)', () => {
            const ref = { current: null as SlashCommandListRef | null };
            render(<SlashCommandList {...defaultProps} ref={ref} />);

            const handled = ref.current?.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Escape' }) });
            expect(handled).toBe(false);
        });
    });
});
