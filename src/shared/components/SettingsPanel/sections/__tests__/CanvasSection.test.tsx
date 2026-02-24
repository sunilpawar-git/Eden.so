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
    const mockToggleCanvasFreeFlow = vi.fn();
    const mockSetAutoSave = vi.fn();
    const mockSetCanvasScrollMode = vi.fn();
    const mockSetConnectorStyle = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useSettingsStore).mockImplementation((selector) => {
            const state = createMockSettingsState({
                connectorStyle: 'solid' as const,
                toggleCanvasGrid: mockToggleCanvasGrid,
                toggleCanvasFreeFlow: mockToggleCanvasFreeFlow,
                setAutoSave: mockSetAutoSave,
                setCanvasScrollMode: mockSetCanvasScrollMode,
                setConnectorStyle: mockSetConnectorStyle,
            });
            return typeof selector === 'function' ? selector(state) : state;
        });
    });

    it('should render free flow toggle', () => {
        render(<CanvasSection />);
        expect(screen.getByText(strings.settings.freeFlow)).toBeInTheDocument();
    });

    it('should reflect canvasFreeFlow state in checkbox', () => {
        vi.mocked(useSettingsStore).mockImplementation((selector) => {
            const state = createMockSettingsState({
                canvasFreeFlow: true,
                toggleCanvasFreeFlow: mockToggleCanvasFreeFlow,
                toggleCanvasGrid: mockToggleCanvasGrid,
                setAutoSave: mockSetAutoSave,
                setCanvasScrollMode: mockSetCanvasScrollMode,
                setConnectorStyle: mockSetConnectorStyle,
            });
            return typeof selector === 'function' ? selector(state) : state;
        });

        render(<CanvasSection />);
        const checkboxes = screen.getAllByRole('checkbox');
        const freeFlowCheckbox = checkboxes.find(
            (cb) => cb.closest('label')?.textContent?.includes(strings.settings.freeFlow)
        );
        expect(freeFlowCheckbox).toBeChecked();
    });

    it('should call toggleCanvasFreeFlow when free flow checkbox is clicked', () => {
        render(<CanvasSection />);
        const checkboxes = screen.getAllByRole('checkbox');
        const freeFlowCheckbox = checkboxes.find(
            (cb) => cb.closest('label')?.textContent?.includes(strings.settings.freeFlow)
        );
        expect(freeFlowCheckbox).toBeDefined();
        fireEvent.click(freeFlowCheckbox!);
        expect(mockToggleCanvasFreeFlow).toHaveBeenCalledOnce();
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

    it('should render connector style section', () => {
        render(<CanvasSection />);
        expect(screen.getByText(strings.settings.connectorStyle)).toBeInTheDocument();
    });

    it('should display solid, subtle, thick, dashed, and dotted connector options', () => {
        render(<CanvasSection />);
        expect(screen.getByLabelText(strings.settings.connectorSolid)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.connectorSubtle)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.connectorThick)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.connectorDashed)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.connectorDotted)).toBeInTheDocument();
    });

    it('should have solid style selected by default', () => {
        render(<CanvasSection />);
        const solidOption = screen.getByLabelText(strings.settings.connectorSolid);
        expect(solidOption).toBeChecked();
    });

    it('should call setConnectorStyle when thick is selected', () => {
        render(<CanvasSection />);
        const thickOption = screen.getByLabelText(strings.settings.connectorThick);
        fireEvent.click(thickOption);
        expect(mockSetConnectorStyle).toHaveBeenCalledWith('thick');
    });
});
