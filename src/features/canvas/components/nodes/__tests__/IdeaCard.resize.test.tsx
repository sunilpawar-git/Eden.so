/**
 * IdeaCard Resize Integration Tests
 * Tests for full resize flow: NodeResizer -> Store -> Persistence
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';
import {
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH,
    MIN_NODE_HEIGHT,
    MAX_NODE_HEIGHT,
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
} from '../../../types/node';

// Mock ReactFlow components with dimension props
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ type, position }: { type: string; position: string }) => (
            <div data-testid={`handle-${type}-${position}`} />
        ),
        Position: { Top: 'top', Bottom: 'bottom' },
        NodeResizer: ({ 
            isVisible, 
            minWidth, 
            maxWidth, 
            minHeight, 
            maxHeight 
        }: { 
            isVisible?: boolean;
            minWidth?: number;
            maxWidth?: number;
            minHeight?: number;
            maxHeight?: number;
        }) => (
            <div 
                data-testid="node-resizer" 
                data-visible={isVisible}
                data-min-width={minWidth}
                data-max-width={maxWidth}
                data-min-height={minHeight}
                data-max-height={maxHeight}
            />
        ),
    };
});

// Mock hooks
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: vi.fn(),
        branchFromNode: vi.fn(),
    }),
}));

vi.mock('@/shared/components/MarkdownRenderer', () => ({
    MarkdownRenderer: ({ content }: { content: string }) => (
        <div data-testid="markdown-renderer">{content}</div>
    ),
}));

describe('IdeaCard Resize Integration', () => {
    const defaultData: IdeaNodeData = {
        prompt: 'Test prompt',
        output: 'Test output',
        isGenerating: false,
        isPromptCollapsed: false,
    };

    const defaultProps = {
        id: 'resize-test-node',
        data: defaultData,
        type: 'idea' as const,
        selected: true,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        zIndex: 0,
        dragging: false,
        selectable: true,
        deletable: true,
        draggable: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    describe('NodeResizer constraint integration', () => {
        it('NodeResizer minWidth matches MIN_NODE_WIDTH constant', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-min-width'))).toBe(MIN_NODE_WIDTH);
        });

        it('NodeResizer maxWidth matches MAX_NODE_WIDTH constant', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-max-width'))).toBe(MAX_NODE_WIDTH);
        });

        it('NodeResizer minHeight matches MIN_NODE_HEIGHT constant', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-min-height'))).toBe(MIN_NODE_HEIGHT);
        });

        it('NodeResizer maxHeight matches MAX_NODE_HEIGHT constant', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-max-height'))).toBe(MAX_NODE_HEIGHT);
        });
    });

    describe('Store dimension clamping', () => {
        it('updateNodeDimensions clamps width below minimum', () => {
            const mockNode = {
                id: 'test-node',
                workspaceId: 'ws-1',
                type: 'idea' as const,
                data: defaultData,
                position: { x: 0, y: 0 },
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('test-node', 50, 200);
            
            const node = useCanvasStore.getState().nodes[0];
            expect(node?.width).toBe(MIN_NODE_WIDTH);
        });

        it('updateNodeDimensions clamps width above maximum', () => {
            const mockNode = {
                id: 'test-node',
                workspaceId: 'ws-1',
                type: 'idea' as const,
                data: defaultData,
                position: { x: 0, y: 0 },
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('test-node', 1500, 200);
            
            const node = useCanvasStore.getState().nodes[0];
            expect(node?.width).toBe(MAX_NODE_WIDTH);
        });

        it('updateNodeDimensions clamps height below minimum', () => {
            const mockNode = {
                id: 'test-node',
                workspaceId: 'ws-1',
                type: 'idea' as const,
                data: defaultData,
                position: { x: 0, y: 0 },
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('test-node', 300, 20);
            
            const node = useCanvasStore.getState().nodes[0];
            expect(node?.height).toBe(MIN_NODE_HEIGHT);
        });

        it('updateNodeDimensions clamps height above maximum', () => {
            const mockNode = {
                id: 'test-node',
                workspaceId: 'ws-1',
                type: 'idea' as const,
                data: defaultData,
                position: { x: 0, y: 0 },
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('test-node', 300, 1500);
            
            const node = useCanvasStore.getState().nodes[0];
            expect(node?.height).toBe(MAX_NODE_HEIGHT);
        });
    });

    describe('Selection-based visibility', () => {
        it('NodeResizer is visible when node is selected', () => {
            render(<IdeaCard {...defaultProps} selected={true} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-visible')).toBe('true');
        });

        it('NodeResizer is hidden when node is not selected', () => {
            render(<IdeaCard {...defaultProps} selected={false} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-visible')).toBe('false');
        });
    });

    describe('Content area scrolling', () => {
        it('content area has proper scrolling class', () => {
            render(<IdeaCard {...defaultProps} />);
            const contentArea = screen.getByTestId('content-area');
            expect(contentArea.className).toContain('contentArea');
        });

        it('content area has nowheel class to prevent zoom conflicts', () => {
            render(<IdeaCard {...defaultProps} />);
            const contentArea = screen.getByTestId('content-area');
            expect(contentArea).toHaveClass('nowheel');
        });
    });

    describe('Dimension constants consistency', () => {
        it('DEFAULT_NODE_WIDTH is within min/max bounds', () => {
            expect(DEFAULT_NODE_WIDTH).toBeGreaterThanOrEqual(MIN_NODE_WIDTH);
            expect(DEFAULT_NODE_WIDTH).toBeLessThanOrEqual(MAX_NODE_WIDTH);
        });

        it('DEFAULT_NODE_HEIGHT is within min/max bounds', () => {
            expect(DEFAULT_NODE_HEIGHT).toBeGreaterThanOrEqual(MIN_NODE_HEIGHT);
            expect(DEFAULT_NODE_HEIGHT).toBeLessThanOrEqual(MAX_NODE_HEIGHT);
        });

        it('MIN values are positive', () => {
            expect(MIN_NODE_WIDTH).toBeGreaterThan(0);
            expect(MIN_NODE_HEIGHT).toBeGreaterThan(0);
        });

        it('MAX values are greater than MIN values', () => {
            expect(MAX_NODE_WIDTH).toBeGreaterThan(MIN_NODE_WIDTH);
            expect(MAX_NODE_HEIGHT).toBeGreaterThan(MIN_NODE_HEIGHT);
        });
    });

    describe('cardWrapper height propagation for vertical resize', () => {
        it('cardWrapper element has correct CSS class for height propagation', () => {
            render(<IdeaCard {...defaultProps} />);
            
            // Find the cardWrapper element (parent of ideaCard which contains contentArea)
            const contentArea = screen.getByTestId('content-area');
            const ideaCard = contentArea.parentElement;
            const cardWrapper = ideaCard?.parentElement;
            
            expect(cardWrapper).toBeTruthy();
            // Verify cardWrapper has the CSS module class applied
            expect(cardWrapper?.className).toContain('cardWrapper');
        });

        it('CSS file contains height: 100% for cardWrapper class', () => {
            // Read and validate CSS file directly for the height rule
            // This ensures vertical resize propagates from ReactFlow node to card
            const cssPath = path.resolve(__dirname, '../IdeaCard.module.css');
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            
            // Extract .cardWrapper rule content using RegExp.exec()
            const cardWrapperRegex = /\.cardWrapper\s*\{([^}]+)\}/;
            const cardWrapperMatch = cardWrapperRegex.exec(cssContent);
            expect(cardWrapperMatch).toBeTruthy();
            
            const cardWrapperContent = cardWrapperMatch?.[1] ?? '';
            // Verify height: 100% is present for vertical resize support
            const heightRegex = /height:\s*100%/;
            expect(heightRegex.test(cardWrapperContent)).toBe(true);
        });
    });
});
