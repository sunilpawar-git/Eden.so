import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasRadar } from '../CanvasRadar';
import { useCanvasStore } from '../../stores/canvasStore';
import { strings } from '@/shared/localization/strings';
import { ReactFlowProvider } from '@xyflow/react';
import { makeNode } from './helpers/radarFixtures';

// Mock useReactFlow
const mockFitView = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => {
    const original = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...original,
        useReactFlow: () => ({
            fitView: mockFitView,
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
        }),
    };
});

describe('CanvasRadar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [] });
    });

    const renderRadar = () =>
        render(<ReactFlowProvider><CanvasRadar /></ReactFlowProvider>);

    it('renders with correct aria-label', () => {
        renderRadar();
        const radar = screen.getByTestId('canvas-radar');
        expect(radar).toHaveAttribute(
            'aria-label',
            strings.canvas.zoomControls.radarLabel,
        );
    });

    it('renders no dots when canvas has no nodes', () => {
        renderRadar();
        const svg = screen.getByTestId('canvas-radar').querySelector('svg');
        const circles = svg?.querySelectorAll('circle') ?? [];
        expect(circles).toHaveLength(0);
    });

    it('renders dots matching node count', () => {
        useCanvasStore.setState({
            nodes: [
                makeNode('n1', 0, 0),
                makeNode('n2', 200, 100),
                makeNode('n3', 400, 300),
            ],
        });
        renderRadar();
        const svg = screen.getByTestId('canvas-radar').querySelector('svg');
        const circles = svg?.querySelectorAll('circle') ?? [];
        expect(circles).toHaveLength(3);
    });

    it('calls fitView on click', () => {
        renderRadar();
        fireEvent.click(screen.getByTestId('canvas-radar'));
        expect(mockFitView).toHaveBeenCalledTimes(1);
        expect(mockFitView).toHaveBeenCalledWith({ padding: 0.2, duration: 300 });
    });

    it('renders as a button element for accessibility', () => {
        renderRadar();
        const radar = screen.getByTestId('canvas-radar');
        expect(radar.tagName).toBe('BUTTON');
    });
});
