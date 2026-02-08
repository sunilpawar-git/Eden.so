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

function setupMock(overrides: Partial<useNodeResizeModule.UseNodeResizeResult> = {}) {
    vi.mocked(useNodeResizeModule.useNodeResize).mockReturnValue({
        expandWidth: mockExpandWidth,
        expandHeight: mockExpandHeight,
        canExpandWidth: true,
        canExpandHeight: true,
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
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            expect(screen.getByRole('button', { name: /expand width/i })).toBeInTheDocument();
        });

        it('should render expand height button when canExpandHeight is true', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            expect(screen.getByRole('button', { name: /expand height/i })).toBeInTheDocument();
        });

        it('should not render width button when canExpandWidth is false', () => {
            setupMock({ canExpandWidth: false });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            expect(screen.queryByRole('button', { name: /expand width/i })).not.toBeInTheDocument();
        });

        it('should not render height button when canExpandHeight is false', () => {
            setupMock({ canExpandHeight: false });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            expect(screen.queryByRole('button', { name: /expand height/i })).not.toBeInTheDocument();
        });

        it('should render both buttons when both can expand', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            expect(screen.getAllByRole('button')).toHaveLength(2);
        });

        it('should render no buttons when neither can expand', () => {
            setupMock({ canExpandWidth: false, canExpandHeight: false });
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            expect(screen.queryAllByRole('button')).toHaveLength(0);
        });
    });

    describe('click handlers', () => {
        it('should call expandWidth when width button is clicked', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            fireEvent.click(screen.getByRole('button', { name: /expand width/i }));
            expect(mockExpandWidth).toHaveBeenCalledTimes(1);
        });

        it('should call expandHeight when height button is clicked', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            fireEvent.click(screen.getByRole('button', { name: /expand height/i }));
            expect(mockExpandHeight).toHaveBeenCalledTimes(1);
        });

        it('should stop propagation on mouseDown to prevent node drag', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            const widthButton = screen.getByRole('button', { name: /expand width/i });

            const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
            const stopPropagationSpy = vi.spyOn(mouseDownEvent, 'stopPropagation');

            widthButton.dispatchEvent(mouseDownEvent);
            expect(stopPropagationSpy).toHaveBeenCalled();
        });
    });

    describe('visibility', () => {
        it('should have visible class when visible prop is true', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            const widthButton = screen.getByRole('button', { name: /expand width/i });
            expect(widthButton.className).toContain('visible');
        });

        it('should not have visible class when visible prop is false', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={false} />);
            const widthButton = screen.getByRole('button', { name: /expand width/i });
            expect(widthButton.className).not.toContain('visible');
        });
    });

    describe('accessibility', () => {
        it('should have accessible labels using string resources', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            expect(screen.getByRole('button', { name: 'Expand width' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Expand height' })).toBeInTheDocument();
        });

        it('should have title attributes for tooltip', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            expect(screen.getByTitle('Expand width')).toBeInTheDocument();
            expect(screen.getByTitle('Expand height')).toBeInTheDocument();
        });
    });

    describe('arrow icons', () => {
        it('should display right arrow for width expansion', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            const widthButton = screen.getByRole('button', { name: /expand width/i });
            expect(widthButton.textContent).toContain('→');
        });

        it('should display down arrow for height expansion', () => {
            render(<NodeResizeButtons nodeId={TEST_NODE_ID} visible={true} />);
            const heightButton = screen.getByRole('button', { name: /expand height/i });
            expect(heightButton.textContent).toContain('↓');
        });
    });
});
