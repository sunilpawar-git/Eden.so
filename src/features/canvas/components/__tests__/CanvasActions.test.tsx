/**
 * CanvasActions Tests
 * TDD: Tests for the combined action buttons (add node + clear canvas)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { CanvasActions } from '../CanvasActions';
import { useCanvasStore } from '../../stores/canvasStore';

// Mock useAddNode
vi.mock('../../hooks/useAddNode', () => ({
    useAddNode: () => vi.fn(),
}));

// Mock ReactFlow
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        useReactFlow: () => ({
            screenToFlowPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
        }),
    };
});

describe('CanvasActions', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    const renderWithProvider = () => {
        return render(
            <ReactFlowProvider>
                <CanvasActions />
            </ReactFlowProvider>
        );
    };

    it('should render add node button', () => {
        renderWithProvider();
        
        const addButton = screen.getByRole('button', { name: /add node/i });
        expect(addButton).toBeDefined();
    });

    it('should render clear canvas button', () => {
        renderWithProvider();
        
        const clearButton = screen.getByRole('button', { name: /clear/i });
        expect(clearButton).toBeDefined();
    });

    it('should disable clear button when no nodes exist', () => {
        useCanvasStore.setState({ nodes: [] });
        renderWithProvider();
        
        const clearButton = screen.getByRole('button', { name: /clear/i });
        expect(clearButton).toHaveProperty('disabled', true);
    });

    it('should enable clear button when nodes exist', () => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: 'test' },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
        });
        renderWithProvider();
        
        const clearButton = screen.getByRole('button', { name: /clear/i });
        expect(clearButton).toHaveProperty('disabled', false);
    });

    it('should show confirmation dialog when clear is clicked', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: 'test' },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
        });
        renderWithProvider();
        
        const clearButton = screen.getByRole('button', { name: /clear/i });
        fireEvent.click(clearButton);
        
        expect(confirmSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    it('should clear canvas when confirmed', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: 'test' },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
        });
        renderWithProvider();
        
        const clearButton = screen.getByRole('button', { name: /clear/i });
        fireEvent.click(clearButton);
        
        expect(useCanvasStore.getState().nodes).toHaveLength(0);
    });

    it('should position buttons at bottom-right', () => {
        renderWithProvider();
        
        const container = screen.getByTestId('canvas-actions');
        expect(container.className).toContain('actionsContainer');
    });
});
