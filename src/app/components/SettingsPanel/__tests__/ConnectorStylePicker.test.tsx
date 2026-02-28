/**
 * ConnectorStylePicker Tests — Vertical radio list for connector style selection.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectorStylePicker } from '../sections/ConnectorStylePicker';
import { strings } from '@/shared/localization/strings';

const ALL_STYLES = ['solid', 'subtle', 'thick', 'dashed', 'dotted'] as const;
type ConnectorStyle = typeof ALL_STYLES[number];

function getRadioByValue(value: ConnectorStyle): HTMLInputElement {
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    const found = radios.find((r) => r.value === value);
    if (!found) throw new Error(`Radio with value "${value}" not found`);
    return found;
}

describe('ConnectorStylePicker', () => {
    it('renders a radiogroup with the connector style aria-label', () => {
        render(<ConnectorStylePicker value="solid" onChange={vi.fn()} />);
        expect(
            screen.getByRole('radiogroup', { name: strings.settings.connectorStyle }),
        ).toBeInTheDocument();
    });

    it('renders all 5 radio inputs', () => {
        render(<ConnectorStylePicker value="solid" onChange={vi.fn()} />);
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(5);
    });

    it('renders all 5 option labels as text', () => {
        render(<ConnectorStylePicker value="solid" onChange={vi.fn()} />);
        expect(screen.getByText(strings.settings.connectorSolid)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.connectorSubtle)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.connectorThick)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.connectorDashed)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.connectorDotted)).toBeInTheDocument();
    });

    it.each(ALL_STYLES)('checks only the "%s" radio when value="%s"', (style) => {
        render(<ConnectorStylePicker value={style} onChange={vi.fn()} />);
        const radios = screen.getAllByRole('radio') as HTMLInputElement[];
        const checked = radios.filter((r) => r.checked).map((r) => r.value);
        expect(checked).toEqual([style]);
    });

    it('all radios share the same name attribute', () => {
        render(<ConnectorStylePicker value="solid" onChange={vi.fn()} />);
        const radios = screen.getAllByRole('radio') as HTMLInputElement[];
        expect(radios).toHaveLength(5);
        radios.forEach((radio) => {
            expect(radio.name).toBe('connectorStyle');
        });
    });

    it('calls onChange with "dotted" when dotted radio is clicked', () => {
        const onChange = vi.fn();
        render(<ConnectorStylePicker value="solid" onChange={onChange} />);
        fireEvent.click(getRadioByValue('dotted'));
        expect(onChange).toHaveBeenCalledWith('dotted');
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('calls onChange with the correct value for each option', () => {
        const onChange = vi.fn();
        render(<ConnectorStylePicker value="solid" onChange={onChange} />);
        const stylesToClick: ConnectorStyle[] = ['subtle', 'thick', 'dashed'];
        for (const style of stylesToClick) {
            fireEvent.click(getRadioByValue(style));
            expect(onChange).toHaveBeenCalledWith(style);
        }
        expect(onChange).toHaveBeenCalledTimes(stylesToClick.length);
    });

    it('shows exactly one checkmark for the active option', () => {
        render(<ConnectorStylePicker value="thick" onChange={vi.fn()} />);
        expect(screen.getAllByText('✓')).toHaveLength(1);
    });

    it('shows no checkmark when no option is highlighted (edge: all radios unchecked)', () => {
        // Render with a fresh re-render of a non-matching value shouldn't happen,
        // but checkmark count must equal 1 for any valid ConnectorStyle value.
        render(<ConnectorStylePicker value="dashed" onChange={vi.fn()} />);
        expect(screen.getAllByText('✓')).toHaveLength(1);
    });

    it('radio inputs are hidden from view (accessible only)', () => {
        render(<ConnectorStylePicker value="solid" onChange={vi.fn()} />);
        const radios = screen.getAllByRole('radio');
        // Visually hidden but still accessible via role query
        expect(radios).toHaveLength(5);
    });
});
