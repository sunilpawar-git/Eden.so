/**
 * DeletableEdge Component Tests - TDD: RED phase
 * Tests for custom edge with midpoint delete button
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeletableEdge } from '../DeletableEdge';
import { useCanvasStore } from '../../../stores/canvasStore';
import { Position } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';

// Mock ReactFlow edge utilities
const mockPath = 'M 0 0 C 50 0, 50 100, 100 100';
const mockLabelX = 50;
const mockLabelY = 50;

vi.mock('@xyflow/react', async (importOriginal) => {
    const original = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...original,
        getBezierPath: vi.fn(() => [mockPath, mockLabelX, mockLabelY]),
        BaseEdge: vi.fn(({ id, path, markerEnd }: { id: string; path: string; markerEnd?: string }) => (
            <g data-testid="base-edge" data-id={id} data-path={path} data-marker-end={markerEnd}>
                <path d={path} />
            </g>
        )),
        EdgeLabelRenderer: vi.fn(({ children }: { children: React.ReactNode }) => (
            <div data-testid="edge-label-renderer">{children}</div>
        )),
    };
});

const defaultProps = {
    id: 'edge-test-1',
    source: 'node-1',
    target: 'node-2',
    sourceX: 100,
    sourceY: 50,
    targetX: 300,
    targetY: 200,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    markerEnd: 'url(#arrow)',
    style: {},
    data: {},
    selected: false,
    animated: false,
    interactionWidth: 20,
    sourceHandleId: null,
    targetHandleId: null,
    pathOptions: undefined,
};

describe('DeletableEdge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            nodes: [],
            edges: [
                {
                    id: 'edge-test-1',
                    workspaceId: 'ws-1',
                    sourceNodeId: 'node-1',
                    targetNodeId: 'node-2',
                    relationshipType: 'related',
                },
            ],
            selectedNodeIds: new Set(),
        });
    });

    it('should render bezier path via BaseEdge', () => {
        render(<DeletableEdge {...defaultProps} />);

        const baseEdge = document.querySelector('[data-testid="base-edge"]');
        expect(baseEdge).toBeTruthy();
        expect(baseEdge?.getAttribute('data-id')).toBe('edge-test-1');
        expect(baseEdge?.getAttribute('data-path')).toBe(mockPath);
    });

    it('should render delete button at edge midpoint', () => {
        render(<DeletableEdge {...defaultProps} />);

        const button = screen.getByRole('button', { name: strings.edge.deleteConnection });
        expect(button).toBeInTheDocument();

        // Button wrapper should be positioned at midpoint
        const wrapper = button.parentElement;
        expect(wrapper?.style.transform).toContain(`translate(${mockLabelX}px`);
        expect(wrapper?.style.transform).toContain(`${mockLabelY}px)`);
    });

    it('should have delete button hidden by default', () => {
        render(<DeletableEdge {...defaultProps} />);

        const button = screen.getByRole('button', { name: strings.edge.deleteConnection });
        const wrapper = button.parentElement;
        // Should NOT have the visible class
        expect(wrapper?.className).not.toContain('visible');
    });

    it('should show delete button on mouse enter of interaction zone', () => {
        render(<DeletableEdge {...defaultProps} />);

        const interactionPath = document.querySelector('[data-testid="edge-interaction"]');
        expect(interactionPath).toBeTruthy();
        fireEvent.mouseEnter(interactionPath!);

        const button = screen.getByRole('button', { name: strings.edge.deleteConnection });
        const wrapper = button.parentElement;
        expect(wrapper?.className).toContain('visible');
    });

    it('should hide delete button on mouse leave', () => {
        render(<DeletableEdge {...defaultProps} />);

        const interactionPath = document.querySelector('[data-testid="edge-interaction"]');
        fireEvent.mouseEnter(interactionPath!);
        fireEvent.mouseLeave(interactionPath!);

        const button = screen.getByRole('button', { name: strings.edge.deleteConnection });
        const wrapper = button.parentElement;
        expect(wrapper?.className).not.toContain('visible');
    });

    it('should call deleteEdge with correct ID on click', () => {
        render(<DeletableEdge {...defaultProps} />);

        const button = screen.getByRole('button', { name: strings.edge.deleteConnection });
        fireEvent.click(button);

        // Edge should be removed from store
        expect(useCanvasStore.getState().edges).toHaveLength(0);
    });

    it('should forward markerEnd prop to BaseEdge', () => {
        render(<DeletableEdge {...defaultProps} markerEnd="url(#custom-arrow)" />);

        const baseEdge = document.querySelector('[data-testid="base-edge"]');
        expect(baseEdge?.getAttribute('data-marker-end')).toBe('url(#custom-arrow)');
    });

    it('should have nodrag nopan classes to prevent canvas interaction', () => {
        render(<DeletableEdge {...defaultProps} />);

        const button = screen.getByRole('button', { name: strings.edge.deleteConnection });
        const wrapper = button.parentElement;
        expect(wrapper?.className).toContain('nodrag');
        expect(wrapper?.className).toContain('nopan');
    });

    it('should use string resource for aria-label', () => {
        render(<DeletableEdge {...defaultProps} />);

        const button = screen.getByRole('button', { name: strings.edge.deleteConnection });
        expect(button.getAttribute('aria-label')).toBe(strings.edge.deleteConnection);
    });

    it('should keep button visible when hovering over the button wrapper', () => {
        render(<DeletableEdge {...defaultProps} />);

        // First hover on interaction path
        const interactionPath = document.querySelector('[data-testid="edge-interaction"]');
        fireEvent.mouseEnter(interactionPath!);

        // Move to the button wrapper (should stay visible)
        const button = screen.getByRole('button', { name: strings.edge.deleteConnection });
        const wrapper = button.parentElement;
        fireEvent.mouseEnter(wrapper!);

        expect(wrapper?.className).toContain('visible');
    });
});
