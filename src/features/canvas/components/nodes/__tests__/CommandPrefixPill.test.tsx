/**
 * CommandPrefixPill Tests - TDD
 * Tests for the locked prefix pill shown when a command is active
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    };

    describe('Rendering', () => {
        it('should render the prefix pill', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            expect(screen.getByTestId('command-prefix-pill')).toBeInTheDocument();
        });

        it('should display the command icon', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            expect(screen.getByText('✨')).toBeInTheDocument();
        });

        it('should display the command label', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            expect(screen.getByText('AI Generate')).toBeInTheDocument();
        });

        it('should show an esc hint', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            expect(screen.getByText('esc')).toBeInTheDocument();
        });

        it('should not have a dismiss button', () => {
            render(<CommandPrefixPill {...defaultProps} />);
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });
});
