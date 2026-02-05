/**
 * TagInput Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagInput } from '../TagInput';
import { useTagStore } from '../../stores/tagStore';

describe('TagInput', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
        useTagStore.setState({ tags: [
            { id: 'tag-1', name: 'work', color: '#3b82f6' },
            { id: 'tag-2', name: 'personal', color: '#22c55e' },
        ]});
        mockOnChange.mockClear();
    });

    it('should render selected tags', () => {
        render(<TagInput selectedTagIds={['tag-1']} onChange={mockOnChange} />);
        expect(screen.getByText('work')).toBeInTheDocument();
    });

    it('should show input when clicking add button', () => {
        render(<TagInput selectedTagIds={[]} onChange={mockOnChange} />);
        
        const addButton = screen.getByLabelText(/add tag/i);
        fireEvent.click(addButton);
        
        expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument();
    });

    it('should add existing tag when selected', () => {
        render(<TagInput selectedTagIds={[]} onChange={mockOnChange} />);
        
        const addButton = screen.getByLabelText(/add tag/i);
        fireEvent.click(addButton);
        
        const input = screen.getByPlaceholderText(/add tag/i);
        fireEvent.change(input, { target: { value: 'work' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        
        expect(mockOnChange).toHaveBeenCalledWith(['tag-1']);
    });

    it('should remove tag when clicking remove button', () => {
        render(<TagInput selectedTagIds={['tag-1', 'tag-2']} onChange={mockOnChange} />);
        
        const removeButtons = screen.getAllByLabelText(/remove/i);
        fireEvent.click(removeButtons[0]!);
        
        expect(mockOnChange).toHaveBeenCalledWith(['tag-2']);
    });

    it('should close input on escape', () => {
        render(<TagInput selectedTagIds={[]} onChange={mockOnChange} />);
        
        const addButton = screen.getByLabelText(/add tag/i);
        fireEvent.click(addButton);
        
        const input = screen.getByPlaceholderText(/add tag/i);
        fireEvent.keyDown(input, { key: 'Escape' });
        
        expect(screen.queryByPlaceholderText(/add tag/i)).not.toBeInTheDocument();
    });
});
