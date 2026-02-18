import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomControls } from '../ZoomControls';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ReactFlowProvider } from '@xyflow/react';

// Mock useReactFlow
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockFitView = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => {
    const original = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...original,
        useReactFlow: () => ({
            zoomIn: mockZoomIn,
            zoomOut: mockZoomOut,
            fitView: mockFitView,
        }),
    };
});

describe('ZoomControls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset settings store
        useSettingsStore.setState({ isCanvasLocked: false });
    });

    const renderWithProvider = (component: React.ReactNode) => {
        return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
    };

    it('should render all 4 buttons', () => {
        renderWithProvider(<ZoomControls />);

        expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
        expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
        expect(screen.getByLabelText('Fit View')).toBeInTheDocument();
        expect(screen.getByLabelText(/Lock Canvas|Unlock Canvas/)).toBeInTheDocument();
    });

    it('should call zoomIn when + is clicked', () => {
        renderWithProvider(<ZoomControls />);

        fireEvent.click(screen.getByLabelText('Zoom In'));
        expect(mockZoomIn).toHaveBeenCalledTimes(1);
    });

    it('should call zoomOut when - is clicked', () => {
        renderWithProvider(<ZoomControls />);

        fireEvent.click(screen.getByLabelText('Zoom Out'));
        expect(mockZoomOut).toHaveBeenCalledTimes(1);
    });

    it('should call fitView when fit button is clicked', () => {
        renderWithProvider(<ZoomControls />);

        fireEvent.click(screen.getByLabelText('Fit View'));
        expect(mockFitView).toHaveBeenCalledTimes(1);
    });

    it('should toggle lock state when lock button is clicked', () => {
        renderWithProvider(<ZoomControls />);

        const lockButton = screen.getByTestId('lock-button');

        // Initial state: Unlocked
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
        expect(lockButton).toHaveAttribute('aria-label', 'Lock Canvas');

        // Click to Lock
        fireEvent.click(lockButton);
        expect(useSettingsStore.getState().isCanvasLocked).toBe(true);
        // Re-render to check update
        expect(lockButton).toHaveAttribute('aria-label', 'Unlock Canvas');

        // Click to Unlock
        fireEvent.click(lockButton);
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
    });

    it('should reflect initial locked state', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderWithProvider(<ZoomControls />);

        const lockButton = screen.getByTestId('lock-button');
        expect(lockButton).toHaveAttribute('aria-label', 'Unlock Canvas');
    });
});
