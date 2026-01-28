/**
 * IdeaCard Feature Tests - Connection handles, resizing, scrollable output
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';

// Mock ReactFlow hooks and components
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ type, position, isConnectable, className }: { 
            type: string; 
            position: string; 
            isConnectable?: boolean;
            className?: string;
        }) => (
            <div 
                data-testid={`handle-${type}-${position}`}
                data-connectable={isConnectable}
                className={className}
            />
        ),
        Position: {
            Top: 'top',
            Bottom: 'bottom',
        },
        NodeResizer: ({ isVisible }: { isVisible?: boolean }) => (
            <div data-testid="node-resizer" data-visible={isVisible} />
        ),
    };
});

// Mock the generation hook
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: vi.fn(),
        branchFromNode: vi.fn(),
    }),
}));

// Mock MarkdownRenderer for testing
vi.mock('@/shared/components/MarkdownRenderer', () => ({
    MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
        <div data-testid="markdown-renderer" className={className}>
            {content}
        </div>
    ),
}));

describe('IdeaCard Features', () => {
    const defaultData: IdeaNodeData = {
        prompt: 'Test prompt content',
        output: undefined,
        isGenerating: false,
        isPromptCollapsed: false,
    };

    const defaultProps = {
        id: 'idea-1',
        data: defaultData,
        type: 'idea' as const,
        selected: false,
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

    describe('Connection handles', () => {
        it('target handle should be connectable', () => {
            render(<IdeaCard {...defaultProps} />);
            const targetHandle = screen.getByTestId('handle-target-top');
            expect(targetHandle.getAttribute('data-connectable')).toBe('true');
        });

        it('source handle should be connectable', () => {
            render(<IdeaCard {...defaultProps} />);
            const sourceHandle = screen.getByTestId('handle-source-bottom');
            expect(sourceHandle.getAttribute('data-connectable')).toBe('true');
        });

        it('handles should have proper CSS class for styling', () => {
            render(<IdeaCard {...defaultProps} />);
            const targetHandle = screen.getByTestId('handle-target-top');
            const sourceHandle = screen.getByTestId('handle-source-bottom');
            
            expect(targetHandle.className).toContain('handle');
            expect(sourceHandle.className).toContain('handle');
        });
    });

    describe('Resizable', () => {
        it('renders NodeResizer component', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByTestId('node-resizer')).toBeInTheDocument();
        });

        it('NodeResizer is not visible when node is not selected', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-visible')).toBe('false');
        });

        it('NodeResizer is visible when node is selected', () => {
            const selectedProps = {
                ...defaultProps,
                selected: true,
            };
            render(<IdeaCard {...selectedProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-visible')).toBe('true');
        });
    });

    describe('Scrollable output', () => {
        it('output section has scrollable styling', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Some output content' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const outputSection = screen.getByTestId('output-section');
            expect(outputSection.className).toContain('outputSection');
        });

        it('output section should be scrollable for long content', () => {
            const longOutput = 'Line\n'.repeat(100);
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: longOutput },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const outputSection = screen.getByTestId('output-section');
            expect(outputSection.className).toContain('outputSection');
            expect(outputSection.textContent).toContain('Line');
        });

        it('output section should contain output content wrapper', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Test output' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const outputSection = screen.getByTestId('output-section');
            expect(outputSection.querySelector('div')).not.toBeNull();
        });

        it('renders output using MarkdownRenderer component', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: '**Bold** text' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const markdownRenderer = screen.getByTestId('markdown-renderer');
            expect(markdownRenderer).toBeInTheDocument();
            expect(markdownRenderer.textContent).toContain('**Bold** text');
        });
    });

    describe('Wheel scroll behavior (ReactFlow zoom prevention)', () => {
        it('output section has nowheel class to prevent ReactFlow zoom', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Some output content' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const outputSection = screen.getByTestId('output-section');
            expect(outputSection).toHaveClass('nowheel');
        });

        it('output section has nowheel class even without content', () => {
            render(<IdeaCard {...defaultProps} />);
            
            const outputSection = screen.getByTestId('output-section');
            expect(outputSection).toHaveClass('nowheel');
        });

        it('output section has nowheel class during generation', () => {
            const generatingProps = {
                ...defaultProps,
                data: { ...defaultData, isGenerating: true },
            };
            render(<IdeaCard {...generatingProps} />);
            
            const outputSection = screen.getByTestId('output-section');
            expect(outputSection).toHaveClass('nowheel');
        });

        it('wheel events stop propagation to prevent canvas zoom', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Long content for scrolling' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const outputSection = screen.getByTestId('output-section');
            
            // Create wheel event with bubbles: true
            const wheelEvent = new WheelEvent('wheel', { 
                bubbles: true,
                deltaY: 100,
            });
            const stopPropagationSpy = vi.spyOn(wheelEvent, 'stopPropagation');
            
            outputSection.dispatchEvent(wheelEvent);
            
            // Verify stopPropagation was called (native listener should call it)
            expect(stopPropagationSpy).toHaveBeenCalled();
        });

        it('wheel events with scroll up stop propagation', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Content for testing' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const outputSection = screen.getByTestId('output-section');
            
            const wheelEvent = new WheelEvent('wheel', { 
                bubbles: true,
                deltaY: -100, // Scroll up
            });
            const stopPropagationSpy = vi.spyOn(wheelEvent, 'stopPropagation');
            
            outputSection.dispatchEvent(wheelEvent);
            
            expect(stopPropagationSpy).toHaveBeenCalled();
        });

        it('output section retains both outputSection and nowheel classes', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Test content' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const outputSection = screen.getByTestId('output-section');
            
            // Should have both the module CSS class and the nowheel class
            expect(outputSection.className).toContain('outputSection');
            expect(outputSection.className).toContain('nowheel');
        });
    });
});
