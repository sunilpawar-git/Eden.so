/**
 * KnowledgeBankEntryCard Tests — Entry card behavior
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeBankEntryCard } from '../components/KnowledgeBankEntryCard';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';

// Mock icons
vi.mock('@/shared/components/icons', () => ({
    FileTextIcon: () => <div data-testid="icon-text">FileTextIcon</div>,
    ImageIcon: () => <div data-testid="icon-image">ImageIcon</div>,
    EditIcon: () => <div data-testid="icon-edit">EditIcon</div>,
    TrashIcon: () => <div data-testid="icon-trash">TrashIcon</div>,
}));

const mockEntry: KnowledgeBankEntry = {
    id: 'kb-1',
    workspaceId: 'ws-1',
    type: 'text',
    title: 'Test Entry',
    content: 'This is test content for the entry card.',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('KnowledgeBankEntryCard', () => {
    const defaultProps = {
        entry: mockEntry,
        onToggle: vi.fn(),
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
    };

    it('renders entry title', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByText('Test Entry')).toBeDefined();
    });

    it('renders content preview', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByText('This is test content for the entry card.')).toBeDefined();
    });

    it('shows text icon for text entries', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByTestId('icon-text')).toBeDefined();
    });

    it('shows image icon for image entries', () => {
        const imageEntry = { ...mockEntry, type: 'image' as const };
        render(<KnowledgeBankEntryCard {...defaultProps} entry={imageEntry} />);
        expect(screen.getByTestId('icon-image')).toBeDefined();
    });

    it('calls onToggle when checkbox is clicked', () => {
        const onToggle = vi.fn();
        render(<KnowledgeBankEntryCard {...defaultProps} onToggle={onToggle} />);

        const checkbox = screen.getByLabelText('Toggle entry enabled');
        fireEvent.click(checkbox);
        expect(onToggle).toHaveBeenCalledWith('kb-1');
    });

    it('shows edit and delete buttons', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByLabelText('Edit entry')).toBeDefined();
        expect(screen.getByLabelText('Delete entry')).toBeDefined();
    });

    it('switches to editor when edit is clicked', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Edit entry'));

        // Editor should now be visible with the entry's title
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        expect(input).toBeDefined();
        expect(input.value).toBe('Test Entry');
    });

    it('shows inline confirmation when delete is clicked', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Delete entry'));

        expect(screen.getByText('Delete?')).toBeDefined();
        expect(screen.getByText('Confirm')).toBeDefined();
        expect(screen.getByText('Cancel')).toBeDefined();
    });

    it('calls onDelete when inline confirm is clicked', () => {
        const onDelete = vi.fn();
        render(<KnowledgeBankEntryCard {...defaultProps} onDelete={onDelete} />);

        fireEvent.click(screen.getByLabelText('Delete entry')); // 1. Click trask
        fireEvent.click(screen.getByText('Confirm')); // 2. Click confirm

        expect(onDelete).toHaveBeenCalledWith('kb-1');
    });

    it('cancels delete when cancel is clicked', () => {
        const onDelete = vi.fn();
        render(<KnowledgeBankEntryCard {...defaultProps} onDelete={onDelete} />);

        fireEvent.click(screen.getByLabelText('Delete entry')); // 1. Click trash
        fireEvent.click(screen.getByText('Cancel')); // 2. Click cancel

        // Should return to normal state (Trash icon visible)
        expect(screen.getByLabelText('Delete entry')).toBeDefined();
        expect(onDelete).not.toHaveBeenCalled();
    });
});
