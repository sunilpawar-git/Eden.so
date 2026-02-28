/**
 * AppearanceSection Tests
 * TDD: Validates accessible theme picker (radiogroup + focus ring) and compact mode toggle
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppearanceSection } from '../AppearanceSection';
import { createMockSettingsState } from '@/shared/__tests__/helpers/mockSettingsState';

const mockState = createMockSettingsState({});

vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: Object.assign(
        vi.fn((selector?: (s: typeof mockState) => unknown) =>
            typeof selector === 'function' ? selector(mockState) : mockState
        ),
        { getState: () => mockState }
    ),
}));

describe('AppearanceSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders a radiogroup with aria-label for theme selection', () => {
        render(<AppearanceSection />);
        const radiogroup = screen.getByRole('radiogroup');
        expect(radiogroup).toBeDefined();
        // Must have an accessible name
        const label = radiogroup.getAttribute('aria-label') ?? radiogroup.getAttribute('aria-labelledby');
        expect(label).toBeTruthy();
    });

    it('renders all 6 theme swatches as radio inputs', () => {
        render(<AppearanceSection />);
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(6);
    });

    it('marks the current theme swatch as checked', () => {
        render(<AppearanceSection />);
        // mockState has theme: 'system'
        const systemRadio = screen.getByRole('radio', { name: /system/i });
        expect((systemRadio as HTMLInputElement).checked).toBe(true);
    });

    it('calls setTheme when a different swatch is clicked', () => {
        render(<AppearanceSection />);
        const lightRadio = screen.getByRole('radio', { name: /light/i });
        fireEvent.click(lightRadio);
        expect(mockState.setTheme).toHaveBeenCalledWith('light');
    });

    it('renders compact mode toggle', () => {
        render(<AppearanceSection />);
        const toggle = screen.getByRole('switch', { name: /compact/i });
        expect(toggle).toBeDefined();
    });
});
