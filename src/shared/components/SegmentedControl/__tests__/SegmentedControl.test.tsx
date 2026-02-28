/**
 * SegmentedControl Tests — Accessible horizontal radio pill group
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from '../SegmentedControl';

const OPTIONS = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Charlie' },
] as const;

describe('SegmentedControl', () => {
    it('renders all option labels', () => {
        render(<SegmentedControl name="test" label="Test Group" options={OPTIONS} value="a" onChange={vi.fn()} />);
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('marks the active option with checked radio', () => {
        render(<SegmentedControl name="test" label="Test Group" options={OPTIONS} value="b" onChange={vi.fn()} />);
        const radios = screen.getAllByRole('radio');
        const betaRadio = radios.find(r => r.getAttribute('value') === 'b');
        expect(betaRadio).toBeChecked();
    });

    it('does not check inactive options', () => {
        render(<SegmentedControl name="test" label="Test Group" options={OPTIONS} value="b" onChange={vi.fn()} />);
        const radios = screen.getAllByRole('radio');
        const alphaRadio = radios.find(r => r.getAttribute('value') === 'a');
        const charlieRadio = radios.find(r => r.getAttribute('value') === 'c');
        expect(alphaRadio).not.toBeChecked();
        expect(charlieRadio).not.toBeChecked();
    });

    it('calls onChange with the correct value on click', () => {
        const onChange = vi.fn();
        render(<SegmentedControl name="test" label="Test Group" options={OPTIONS} value="a" onChange={onChange} />);
        const radios = screen.getAllByRole('radio');
        const charlieRadio = radios.find(r => r.getAttribute('value') === 'c')!;
        fireEvent.click(charlieRadio);
        expect(onChange).toHaveBeenCalledWith('c');
    });

    it('uses the correct name attribute on radios', () => {
        render(<SegmentedControl name="scroll-mode" label="Scroll" options={OPTIONS} value="a" onChange={vi.fn()} />);
        const radios = screen.getAllByRole('radio');
        radios.forEach((radio) => {
            expect(radio).toHaveAttribute('name', 'scroll-mode');
        });
    });

    it('renders preview content when provided', () => {
        const optionsWithPreview = [
            { value: 'x', label: 'X', preview: <span data-testid="preview-x">PX</span> },
            { value: 'y', label: 'Y' },
        ];
        render(<SegmentedControl name="test" label="Previews" options={optionsWithPreview} value="x" onChange={vi.fn()} />);
        expect(screen.getByTestId('preview-x')).toBeInTheDocument();
    });

    it('sets aria-label on the radiogroup', () => {
        render(<SegmentedControl name="test" label="My Group" options={OPTIONS} value="a" onChange={vi.fn()} />);
        const radiogroup = screen.getByRole('radiogroup');
        expect(radiogroup).toHaveAttribute('aria-label', 'My Group');
    });

    it('individual radios do not have redundant aria-label', () => {
        render(<SegmentedControl name="test" label="Group" options={OPTIONS} value="a" onChange={vi.fn()} />);
        const radios = screen.getAllByRole('radio');
        radios.forEach((radio) => {
            expect(radio).not.toHaveAttribute('aria-label');
        });
    });
});
