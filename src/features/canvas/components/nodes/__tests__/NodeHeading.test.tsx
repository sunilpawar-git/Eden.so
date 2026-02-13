/**
 * NodeHeading Component Tests - TDD
 * Tests heading rendering, placeholder, Tab key, and AI placeholder behavior
 * Enter/Escape are handled at ProseMirror level by SubmitKeymap (inside useHeadingEditor)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeHeading } from '../NodeHeading';
import { strings } from '@/shared/localization/strings';

// Mock useHeadingEditor (replaces old useTipTapEditor mock)
vi.mock('../../../hooks/useHeadingEditor', async () =>
    (await import('./helpers/tipTapTestMock')).useHeadingEditorMock()
);
vi.mock('../TipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).componentMock()
);

// Mock canvasStore — NodeHeading reads inputMode for placeholder
const mockInputMode = vi.fn(() => 'note');
vi.mock('../../../stores/canvasStore', () => ({
    useCanvasStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ inputMode: mockInputMode() }),
}));

describe('NodeHeading', () => {
    const defaultProps = {
        heading: '',
        isEditing: false,
        onHeadingChange: vi.fn(),
        onEnterKey: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        mockInputMode.mockReturnValue('note');
        const { resetMockState } = await import('./helpers/tipTapTestMock');
        resetMockState();
    });

    describe('Rendering', () => {
        it('renders heading container with test id', () => {
            render(<NodeHeading {...defaultProps} />);
            expect(screen.getByTestId('node-heading')).toBeInTheDocument();
        });

        it('renders placeholder when heading is empty and editing', () => {
            render(<NodeHeading {...defaultProps} isEditing={true} />);
            expect(screen.getByTestId('heading-editor')).toBeInTheDocument();
        });

        it('renders heading text in view mode via TipTap editor', () => {
            render(<NodeHeading {...defaultProps} heading="My Title" />);
            expect(screen.getByTestId('node-heading-view')).toHaveTextContent('My Title');
        });

        it('renders TipTap editor in edit mode', () => {
            render(<NodeHeading {...defaultProps} heading="My Title" isEditing={true} />);
            expect(screen.getByTestId('heading-editor')).toBeInTheDocument();
        });

        it('renders Title placeholder from string resources', () => {
            render(<NodeHeading {...defaultProps} isEditing={true} />);
            const editor = screen.getByRole('textbox');
            expect(editor.getAttribute('placeholder')).toBe(strings.ideaCard.headingPlaceholder);
        });

        it('renders Ask AI placeholder when inputMode is ai', () => {
            mockInputMode.mockReturnValue('ai');
            render(<NodeHeading {...defaultProps} isEditing={true} />);
            const editor = screen.getByRole('textbox');
            expect(editor.getAttribute('placeholder')).toBe(strings.ideaCard.headingAiPlaceholder);
        });
    });

    describe('Tab key interaction', () => {
        it('calls onEnterKey when Tab is pressed in edit mode', () => {
            const onEnterKey = vi.fn();
            render(<NodeHeading {...defaultProps} isEditing={true} onEnterKey={onEnterKey} />);
            fireEvent.keyDown(screen.getByTestId('node-heading'), { key: 'Tab' });
            expect(onEnterKey).toHaveBeenCalled();
        });

        it('does not call onEnterKey for Shift+Tab', () => {
            const onEnterKey = vi.fn();
            render(<NodeHeading {...defaultProps} isEditing={true} onEnterKey={onEnterKey} />);
            fireEvent.keyDown(screen.getByTestId('node-heading'), { key: 'Tab', shiftKey: true });
            expect(onEnterKey).not.toHaveBeenCalled();
        });

        it('suppresses Tab when slash suggestion popup is active', async () => {
            const onEnterKey = vi.fn();
            const { getMockState } = await import('./helpers/tipTapTestMock');
            render(<NodeHeading {...defaultProps} isEditing={true} onEnterKey={onEnterKey} />);
            getMockState().suggestionActiveRef!.current = true;
            fireEvent.keyDown(screen.getByTestId('node-heading'), { key: 'Tab' });
            expect(onEnterKey).not.toHaveBeenCalled();
        });
    });

    describe('Other interactions', () => {
        it('calls onHeadingChange when content changes in edit mode', () => {
            const onHeadingChange = vi.fn();
            render(<NodeHeading {...defaultProps} isEditing={true} onHeadingChange={onHeadingChange} />);
            const editor = screen.getByRole('textbox');
            fireEvent.change(editor, { target: { value: 'New Title' } });
            expect(onHeadingChange).toHaveBeenCalledWith('New Title');
        });

        it('double-clicking view-mode heading triggers onDoubleClick', () => {
            const onDoubleClick = vi.fn();
            render(<NodeHeading {...defaultProps} heading="My Title" onDoubleClick={onDoubleClick} />);
            fireEvent.doubleClick(screen.getByTestId('node-heading'));
            expect(onDoubleClick).toHaveBeenCalled();
        });

        it('Enter key does not trigger React-level handler (handled by SubmitKeymap)', () => {
            const onEnterKey = vi.fn();
            render(<NodeHeading {...defaultProps} isEditing={true} onEnterKey={onEnterKey} />);
            fireEvent.keyDown(screen.getByTestId('node-heading'), { key: 'Enter' });
            expect(onEnterKey).not.toHaveBeenCalled();
        });
    });

    describe('Empty vs populated', () => {
        it('shows placeholder in view mode when heading is empty', () => {
            render(<NodeHeading {...defaultProps} heading="" />);
            const view = screen.getByTestId('node-heading-view');
            expect(view.getAttribute('placeholder')).toBe(strings.ideaCard.headingPlaceholder);
        });

        it('shows actual heading text when populated', () => {
            render(<NodeHeading {...defaultProps} heading="Project Ideas" />);
            const view = screen.getByTestId('node-heading-view');
            expect(view).toHaveTextContent('Project Ideas');
        });
    });
});
