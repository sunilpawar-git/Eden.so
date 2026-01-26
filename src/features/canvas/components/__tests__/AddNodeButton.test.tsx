import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddNodeButton } from '../AddNodeButton';
import { useCanvasStore } from '../../stores/canvasStore';
import { useReactFlow } from '@xyflow/react';

// Mock React Flow
vi.mock('@xyflow/react', () => ({
    useReactFlow: vi.fn(),
}));

describe('AddNodeButton', () => {
    const mockScreenToFlowPosition = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useReactFlow).mockReturnValue({
            screenToFlowPosition: mockScreenToFlowPosition,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        mockScreenToFlowPosition.mockReturnValue({ x: 500, y: 500 });

        // Reset store
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('should add a new node to the store when clicked', () => {
        render(<AddNodeButton />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(1);
        expect(nodes[0]!.type).toBe('prompt');
        expect(nodes[0]!.position).toEqual({ x: 500, y: 500 });
    });

    it('should call screenToFlowPosition with viewport center', () => {
        // Mock window dimensions
        const originalWidth = window.innerWidth;
        const originalHeight = window.innerHeight;
        Object.defineProperty(window, 'innerWidth', { value: 1000 });
        Object.defineProperty(window, 'innerHeight', { value: 800 });

        render(<AddNodeButton />);
        fireEvent.click(screen.getByRole('button'));

        expect(mockScreenToFlowPosition).toHaveBeenCalledWith({
            x: 500,
            y: 400,
        });

        // Restore window dimensions
        Object.defineProperty(window, 'innerWidth', { value: originalWidth });
        Object.defineProperty(window, 'innerHeight', { value: originalHeight });
    });
});
