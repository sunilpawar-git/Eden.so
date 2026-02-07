/**
 * CommandPrefixPill Tests - TDD
 * Tests for the locked prefix pill shown when a command is active
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPrefixPill } from '../CommandPrefixPill';
import type { SlashCommand } from '../../../types/slashCommand';

const mockCommand: SlashCommand = {
    id: 'ai-generate',
    labelKey: 'slashCommands.aiGenerate.label',
    descriptionKey: 'slashCommands.aiGenerate.description',
    icon: '✨',
    keywords: ['ai', 'generate', 'create', 'write'],
    prefix: 'ai',
};

describe('CommandPrefixPill', () => {
    const defaultProps = {
        command: mockCommand,
        onDeactivate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render the prefix pill', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            expect(screen.getByTestId('command-prefix-pill')).toBeInTheDocument();
        });

        it('should display the command icon', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            expect(screen.getByText('✨')).toBeInTheDocument();
        });

        it('should display the prefix with separator', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            expect(screen.getByText('/ai:')).toBeInTheDocument();
        });

        it('should have a dismiss button', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            const dismissBtn = screen.getByRole('button', { name: /deactivate/i });
            expect(dismissBtn).toBeInTheDocument();
        });
    });

    describe('Interaction', () => {
        it('should call onDeactivate when dismiss button is clicked', () => {
            const onDeactivate = vi.fn();
            render(<CommandPrefixPill {...defaultProps} onDeactivate={onDeactivate} />);
            
            const dismissBtn = screen.getByRole('button', { name: /deactivate/i });
            fireEvent.click(dismissBtn);
            
            expect(onDeactivate).toHaveBeenCalledTimes(1);
        });

        it('should not propagate click events from dismiss button', () => {
            const outerClick = vi.fn();
            render(
                <div onClick={outerClick}>
                    <CommandPrefixPill {...defaultProps} />
                </div>
            );
            
            const dismissBtn = screen.getByRole('button', { name: /deactivate/i });
            fireEvent.click(dismissBtn);
            
            expect(outerClick).not.toHaveBeenCalled();
        });
    });
});
