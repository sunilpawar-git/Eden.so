/**
 * DeletableEdge Component Tests - Component integrity validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider, Position } from '@xyflow/react';
import { DeletableEdge } from '../DeletableEdge';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { createMockSettingsState } from '@/shared/__tests__/helpers/mockSettingsState';
import styles from '../DeletableEdge.module.css';

// Mock the settings store with getState() support
vi.mock('@/shared/stores/settingsStore', () => {
    const selectorFn = vi.fn();
    Object.assign(selectorFn, { getState: () => createMockSettingsState({}) });
    return { useSettingsStore: selectorFn };
});

// Mock the canvas store
vi.mock('../../stores/canvasStore', () => ({
    useCanvasStore: vi.fn(),
}));

// Provide minimal required props for EdgeProps
const mockEdgeProps = {
    id: 'test-edge-1',
    source: 'test-source',
    target: 'test-target',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    style: { stroke: 'red' }, // Custom inline style test
};

describe('DeletableEdge ConnectorStyles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const setupWithStyle = (connectorStyle: string) => {
        vi.mocked(useSettingsStore).mockImplementation((selector) => {
            const state = createMockSettingsState({ connectorStyle });
            return typeof selector === 'function' ? selector(state) : state;
        });

        // SVG wrapper is needed because React Flow BaseEdge renders an SVG path
        render(
            <ReactFlowProvider>
                <svg>
                    <DeletableEdge {...mockEdgeProps} />
                </svg>
            </ReactFlowProvider>
        );
    };

    it('should apply edgeSolid class by default', () => {
        setupWithStyle('solid');
        // BaseEdge adds its own react-flow__edge-path class and assigns our class manually
        // We find the path by its data-testid inside BaseEdge or by the className we passed
        // Wait, BaseEdge doesn't natively expose data-testid. 
        // We will just search the DOM for the class using container query.
        const path = document.querySelector(`.react-flow__edge-path.${styles.edgeSolid}`);
        expect(path).toBeInTheDocument();
        // Check if inline style overrides persist
        expect(path).toHaveStyle({ stroke: 'red' });
    });

    it('should apply edgeSubtle class when style is subtle', () => {
        setupWithStyle('subtle');
        const path = document.querySelector(`.react-flow__edge-path.${styles.edgeSubtle}`);
        expect(path).toBeInTheDocument();
    });

    it('should apply edgeThick class when style is thick', () => {
        setupWithStyle('thick');
        const path = document.querySelector(`.react-flow__edge-path.${styles.edgeThick}`);
        expect(path).toBeInTheDocument();
    });

    it('should apply edgeDashed class when style is dashed', () => {
        setupWithStyle('dashed');
        const path = document.querySelector(`.react-flow__edge-path.${styles.edgeDashed}`);
        expect(path).toBeInTheDocument();
    });

    it('should apply edgeDotted class when style is dotted', () => {
        setupWithStyle('dotted');
        const path = document.querySelector(`.react-flow__edge-path.${styles.edgeDotted}`);
        expect(path).toBeInTheDocument();
    });
});
