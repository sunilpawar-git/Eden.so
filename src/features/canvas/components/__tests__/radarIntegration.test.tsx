import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZoomControls } from '../ZoomControls';
import { useCanvasStore } from '../../stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ReactFlowProvider } from '@xyflow/react';
import { makeNode } from './helpers/radarFixtures';

// Mock useReactFlow
vi.mock('@xyflow/react', async (importOriginal) => {
    const original = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...original,
        useReactFlow: () => ({
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
            fitView: vi.fn(),
        }),
    };
});

describe('Radar integration in ZoomControls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [] });
        useSettingsStore.setState({ isCanvasLocked: false });
    });

    const renderControls = () =>
        render(<ReactFlowProvider><ZoomControls /></ReactFlowProvider>);

    it('renders CanvasRadar inside ZoomControls', () => {
        renderControls();
        expect(screen.getByTestId('canvas-radar')).toBeInTheDocument();
    });

    it('shows radar dots when canvas has nodes', () => {
        useCanvasStore.setState({
            nodes: [makeNode('n1', 100, 200), makeNode('n2', 300, 400)],
        });
        renderControls();
        const radar = screen.getByTestId('canvas-radar');
        const circles = radar.querySelectorAll('circle');
        expect(circles).toHaveLength(2);
    });

    it('radar is the first child of zoom controls', () => {
        renderControls();
        const controls = screen.getByTestId('zoom-controls');
        const firstChild = controls.firstElementChild;
        expect(firstChild).toBe(screen.getByTestId('canvas-radar'));
    });
});
