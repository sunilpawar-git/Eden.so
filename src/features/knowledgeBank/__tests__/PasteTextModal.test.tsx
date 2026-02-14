/**
 * PasteTextModal Tests — Verifies modal behavior
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasteTextModal } from '../components/PasteTextModal';

describe('PasteTextModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
    };

    it('renders nothing when closed', () => {
        const { container } = render(
            <PasteTextModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />
        );
        expect(container.innerHTML).toBe('');
    });

    it('renders modal when open', () => {
        render(<PasteTextModal {...defaultProps} />);
        expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('shows title input and textarea', () => {
        render(<PasteTextModal {...defaultProps} />);
        expect(screen.getByPlaceholderText('Entry title')).toBeDefined();
        expect(screen.getByPlaceholderText('Paste your text here...')).toBeDefined();
    });

    it('save button is disabled when fields are empty', () => {
        render(<PasteTextModal {...defaultProps} />);
        const buttons = screen.getAllByRole('button');
        const saveButton = buttons.find(
            (btn) => btn.textContent === 'Save to Knowledge Bank' && !btn.getAttribute('aria-label')
        );
        expect(saveButton).toBeDefined();
        expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    });

    it('calls onSave with trimmed title and content', () => {
        const onSave = vi.fn();
        render(<PasteTextModal {...defaultProps} onSave={onSave} />);

        fireEvent.change(screen.getByPlaceholderText('Entry title'), {
            target: { value: '  My Title  ' },
        });
        fireEvent.change(screen.getByPlaceholderText('Paste your text here...'), {
            target: { value: 'Some content' },
        });

        const buttons = screen.getAllByRole('button');
        const saveButton = buttons.find(
            (btn) => btn.textContent === 'Save to Knowledge Bank' && !btn.getAttribute('aria-label')
        );
        fireEvent.click(saveButton!);

        expect(onSave).toHaveBeenCalledWith('My Title', 'Some content');
    });

    it('calls onClose when cancel is clicked', () => {
        const onClose = vi.fn();
        render(<PasteTextModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when backdrop is clicked', () => {
        const onClose = vi.fn();
        render(<PasteTextModal {...defaultProps} onClose={onClose} />);

        const backdrop = document.querySelector('[class*="backdrop"]');
        expect(backdrop).toBeDefined();
        if (backdrop) fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('shows character count', () => {
        render(<PasteTextModal {...defaultProps} />);
        expect(screen.getByText('0 / 10,000')).toBeDefined();
    });

    it('updates character count on input', () => {
        render(<PasteTextModal {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText('Paste your text here...'), {
            target: { value: 'Hello' },
        });
        expect(screen.getByText('5 / 10,000')).toBeDefined();
    });
});
