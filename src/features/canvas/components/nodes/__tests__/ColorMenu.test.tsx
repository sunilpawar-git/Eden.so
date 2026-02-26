import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { ColorMenu } from '../ColorMenu';

function Controlled({
    disabled = false,
}: {
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [colorKey, setColorKey] = useState<'default' | 'danger' | 'success' | 'warning'>('default');
    return (
        <ColorMenu
            isOpen={isOpen}
            onToggle={() => setIsOpen((prev) => !prev)}
            onClose={() => setIsOpen(false)}
            selectedColorKey={colorKey}
            onColorSelect={setColorKey}
            disabled={disabled}
        />
    );
}

describe('ColorMenu', () => {
    it('renders color trigger button', () => {
        render(<Controlled />);
        expect(screen.getByLabelText('Color')).toBeInTheDocument();
    });

    it('opens and renders color options', () => {
        render(<Controlled />);
        fireEvent.click(screen.getByLabelText('Color'));
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getByText('Default')).toBeInTheDocument();
        expect(screen.getByText('Red (Attention)')).toBeInTheDocument();
        expect(screen.getByText('Yellow (In Progress)')).toBeInTheDocument();
        expect(screen.getByText('Green (Complete)')).toBeInTheDocument();
    });

    it('selecting a color closes menu', () => {
        render(<Controlled />);
        fireEvent.click(screen.getByLabelText('Color'));
        fireEvent.click(screen.getByText('Red (Attention)'));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('is disabled when disabled prop is true', () => {
        render(<Controlled disabled />);
        expect(screen.getByLabelText('Color')).toBeDisabled();
    });

    it('does not open when disabled', () => {
        render(<Controlled disabled />);
        fireEvent.click(screen.getByLabelText('Color'));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('passes correct key for each color option', () => {
        const onColorSelect = vi.fn();
        const onClose = vi.fn();
        render(
            <ColorMenu
                isOpen={true}
                onToggle={vi.fn()}
                onClose={onClose}
                selectedColorKey="default"
                onColorSelect={onColorSelect}
            />
        );
        fireEvent.click(screen.getByText('Red (Attention)'));
        expect(onColorSelect).toHaveBeenCalledWith('danger');

        onColorSelect.mockClear();
        onClose.mockClear();
        render(
            <ColorMenu
                isOpen={true}
                onToggle={vi.fn()}
                onClose={vi.fn()}
                selectedColorKey="default"
                onColorSelect={onColorSelect}
            />
        );
        fireEvent.click(screen.getAllByText('Yellow (In Progress)')[0]!);
        expect(onColorSelect).toHaveBeenCalledWith('warning');

        onColorSelect.mockClear();
        render(
            <ColorMenu
                isOpen={true}
                onToggle={vi.fn()}
                onClose={vi.fn()}
                selectedColorKey="default"
                onColorSelect={onColorSelect}
            />
        );
        fireEvent.click(screen.getAllByText('Green (Complete)')[0]!);
        expect(onColorSelect).toHaveBeenCalledWith('success');
    });

    it('does not reselect same color', () => {
        const onColorSelect = vi.fn();
        render(
            <ColorMenu
                isOpen={true}
                onToggle={vi.fn()}
                onClose={vi.fn()}
                selectedColorKey="default"
                onColorSelect={onColorSelect}
            />
        );
        fireEvent.click(screen.getByText('Default'));
        expect(onColorSelect).not.toHaveBeenCalled();
    });
});
