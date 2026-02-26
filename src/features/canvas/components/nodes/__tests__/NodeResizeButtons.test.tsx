/**
 * NodeResizeButtons Component Tests - TDD: Write tests FIRST
 * Tests for resize arrow button visibility, clicks, and accessibility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeResizeButtons } from '../NodeResizeButtons';
import * as useNodeResizeModule from '../../../hooks/useNodeResize';

// Mock the hook
vi.mock('../../../hooks/useNodeResize');

const mockExpandWidth = vi.fn();
const mockExpandHeight = vi.fn();
const mockShrinkWidth = vi.fn();
const mockShrinkHeight = vi.fn();

function setupMock(overrides: Partial<useNodeResizeModule.UseNodeResizeResult> = {}) {
    vi.mocked(useNodeResizeModule.useNodeResize).mockReturnValue({
        expandWidth: mockExpandWidth,
        expandHeight: mockExpandHeight,
        shrinkWidth: mockShrinkWidth,
        shrinkHeight: mockShrinkHeight,
        canExpandWidth: true,
        canExpandHeight: true,
        canShrinkWidth: false,
        canShrinkHeight: false,
        ...overrides,
    });
}

describe('NodeResizeButtons', () => {
    const TEST_NODE_ID = 'test-node-1';

    beforeEach(() => {
        vi.clearAllMocks();
        setupMock();
    });

    describe('rendering', () => {
        it('should render expand width button when canExpandWidth is true', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.getByRole('button', { name: /expand width/i })).toBeInTheDocument();
        });

        it('should render expand height button when canExpandHeight is true', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.getByRole('button', { name: /expand height/i })).toBeInTheDocument();
        });

        it('should not render width button when canExpandWidth is false', () => {
            setupMock({ canExpandWidth: false });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.queryByRole('button', { name: /expand width/i })).not.toBeInTheDocument();
        });

        it('should not render height button when canExpandHeight is false', () => {
            setupMock({ canExpandHeight: false });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.queryByRole('button', { name: /expand height/i })).not.toBeInTheDocument();
        });

        it('should render both buttons when both can expand', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.getAllByRole('button')).toHaveLength(2);
        });

        it('should render no buttons when neither can expand', () => {
            setupMock({ canExpandWidth: false, canExpandHeight: false });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.queryAllByRole('button')).toHaveLength(0);
        });
    });

    describe('click handlers', () => {
        it('should call expandWidth when width button is clicked', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            fireEvent.click(screen.getByRole('button', { name: /expand width/i }));
            expect(mockExpandWidth).toHaveBeenCalledTimes(1);
        });

        it('should call expandHeight when height button is clicked', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            fireEvent.click(screen.getByRole('button', { name: /expand height/i }));
            expect(mockExpandHeight).toHaveBeenCalledTimes(1);
        });

        it('should stop propagation on mouseDown to prevent node drag', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            const widthButton = screen.getByRole('button', { name: /expand width/i });

            const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
            const stopPropagationSpy = vi.spyOn(mouseDownEvent, 'stopPropagation');

            widthButton.dispatchEvent(mouseDownEvent);
            expect(stopPropagationSpy).toHaveBeenCalled();
        });
    });

    describe('visibility', () => {
        it('buttons start with opacity 0 (hidden via CSS)', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            const widthButton = screen.getByRole('button', { name: /expand width/i });
            expect(widthButton.className).toContain('resizeButton');
        });
    });

    describe('accessibility', () => {
        it('should have accessible labels using string resources for expand buttons', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.getByRole('button', { name: 'Expand width' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Expand height' })).toBeInTheDocument();
        });

        it('should have accessible labels using string resources for shrink buttons', () => {
            setupMock({ canShrinkWidth: true, canShrinkHeight: true });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.getByRole('button', { name: 'Reduce width' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Reduce height' })).toBeInTheDocument();
        });

        it('should have title attributes for tooltip', () => {
            setupMock({ canShrinkWidth: true, canShrinkHeight: true });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.getByTitle('Expand width')).toBeInTheDocument();
            expect(screen.getByTitle('Expand height')).toBeInTheDocument();
            expect(screen.getByTitle('Reduce width')).toBeInTheDocument();
            expect(screen.getByTitle('Reduce height')).toBeInTheDocument();
        });
    });

    describe('arrow icons', () => {
        it('should display right arrow for width expansion', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            const widthButton = screen.getByRole('button', { name: /expand width/i });
            expect(widthButton.textContent).toContain('→');
        });

        it('should display down arrow for height expansion', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            const heightButton = screen.getByRole('button', { name: /expand height/i });
            expect(heightButton.textContent).toContain('↓');
        });
    });

    describe('shrink functionality', () => {
        it('should render shrink width button when canShrinkWidth is true', () => {
            setupMock({ canShrinkWidth: true });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.getByRole('button', { name: /reduce width/i })).toBeInTheDocument();
        });

        it('should render shrink height button when canShrinkHeight is true', () => {
            setupMock({ canShrinkHeight: true });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            expect(screen.getByRole('button', { name: /reduce height/i })).toBeInTheDocument();
        });

        it('should call shrinkWidth when shrink width button is clicked', () => {
            setupMock({ canShrinkWidth: true });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            fireEvent.click(screen.getByRole('button', { name: /reduce width/i }));
            expect(mockShrinkWidth).toHaveBeenCalledTimes(1);
        });

        it('should call shrinkHeight when shrink height button is clicked', () => {
            setupMock({ canShrinkHeight: true });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} />);
            fireEvent.click(screen.getByRole('button', { name: /reduce height/i }));
            expect(mockShrinkHeight).toHaveBeenCalledTimes(1);
        });
    });
});
