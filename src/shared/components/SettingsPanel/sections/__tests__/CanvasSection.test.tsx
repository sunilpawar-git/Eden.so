/**
 * Canvas Section Tests - TDD for canvas settings UI
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasSection } from '../CanvasSection';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { strings } from '@/shared/localization/strings';
import { createMockSettingsState } from '@/shared/__tests__/helpers/mockSettingsState';

vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: vi.fn(),
}));

describe('CanvasSection', () => {
    const mockToggleCanvasGrid = vi.fn();
    const mockSetAutoSave = vi.fn();
    const mockSetCanvasScrollMode = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useSettingsStore).mockImplementation((selector) => {
            const state = createMockSettingsState({
                toggleCanvasGrid: mockToggleCanvasGrid,
                setAutoSave: mockSetAutoSave,
                setCanvasScrollMode: mockSetCanvasScrollMode,
            });
            return typeof selector === 'function' ? selector(state) : state;
        });
    });

    it('should render canvas grid toggle', () => {
        render(<CanvasSection />);
        expect(screen.getAllByText(strings.settings.canvasGrid).length).toBeGreaterThan(0);
    });

    it('should render auto-save toggle', () => {
        render(<CanvasSection />);
        expect(screen.getAllByText(strings.settings.autoSave).length).toBeGreaterThan(0);
    });

    it('should render scroll mode section', () => {
        render(<CanvasSection />);
        expect(screen.getByText(strings.settings.canvasScrollMode)).toBeInTheDocument();
    });

    it('should display zoom and navigate scroll mode options', () => {
        render(<CanvasSection />);
        expect(screen.getByLabelText(strings.settings.canvasScrollZoom)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.canvasScrollNavigate)).toBeInTheDocument();
    });

    it('should have zoom mode selected by default', () => {
        render(<CanvasSection />);
        const zoomOption = screen.getByLabelText(strings.settings.canvasScrollZoom);
        expect(zoomOption).toBeChecked();
    });

    it('should call setCanvasScrollMode when navigate is selected', () => {
        render(<CanvasSection />);
        const navigateOption = screen.getByLabelText(strings.settings.canvasScrollNavigate);
        fireEvent.click(navigateOption);
        expect(mockSetCanvasScrollMode).toHaveBeenCalledWith('navigate');
    });

    it('should call setCanvasScrollMode when zoom is selected', () => {
        vi.mocked(useSettingsStore).mockImplementation((selector) => {
            const state = createMockSettingsState({
                canvasScrollMode: 'navigate' as const,
                toggleCanvasGrid: mockToggleCanvasGrid,
                setAutoSave: mockSetAutoSave,
                setCanvasScrollMode: mockSetCanvasScrollMode,
            });
            return typeof selector === 'function' ? selector(state) : state;
        });

        render(<CanvasSection />);
        const zoomOption = screen.getByLabelText(strings.settings.canvasScrollZoom);
        fireEvent.click(zoomOption);
        expect(mockSetCanvasScrollMode).toHaveBeenCalledWith('zoom');
    });
});
