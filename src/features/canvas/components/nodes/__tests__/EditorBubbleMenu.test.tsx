/**
 * EditorBubbleMenu Tests – TDD RED-GREEN
 * Covers rendering, aria-labels, toggle commands, and active states
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorBubbleMenu } from '../EditorBubbleMenu';
import { strings } from '@/shared/localization/strings';

function createMockEditor(overrides: Record<string, boolean> = {}) {
    const runFn = vi.fn();
    const chain = {
        focus: vi.fn(() => chain),
        toggleBold: vi.fn(() => chain),
        toggleItalic: vi.fn(() => chain),
        toggleStrike: vi.fn(() => chain),
        toggleCode: vi.fn(() => chain),
        run: runFn,
    };

    return {
        chain: vi.fn(() => chain),
        isActive: vi.fn((format: string) => overrides[format] ?? false),
        _chain: chain,
        _run: runFn,
    };
}

vi.mock('@tiptap/react/menus', () => ({
    BubbleMenu: ({ children }: { editor: unknown; children: React.ReactNode }) => (
        <div data-testid="bubble-menu-wrapper">{children}</div>
    ),
}));

describe('EditorBubbleMenu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when editor is null', () => {
        const { container } = render(<EditorBubbleMenu editor={null} />);
        expect(container.innerHTML).toBe('');
    });

    it('renders four formatting buttons with correct aria-labels', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        expect(screen.getByLabelText(strings.formatting.bold)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.italic)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.strikethrough)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.code)).toBeInTheDocument();
    });

    it('calls toggleBold on Bold button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.bold));
        expect(editor.chain).toHaveBeenCalled();
        expect(editor._chain.focus).toHaveBeenCalled();
        expect(editor._chain.toggleBold).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('calls toggleItalic on Italic button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.italic));
        expect(editor._chain.toggleItalic).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('calls toggleStrike on Strikethrough button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.strikethrough));
        expect(editor._chain.toggleStrike).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('calls toggleCode on Code button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.code));
        expect(editor._chain.toggleCode).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('prevents default and stops propagation on mouseDown to preserve selection', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        const boldButton = screen.getByLabelText(strings.formatting.bold);
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        const preventSpy = vi.spyOn(event, 'preventDefault');
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        boldButton.dispatchEvent(event);

        expect(preventSpy).toHaveBeenCalled();
        expect(stopSpy).toHaveBeenCalled();
    });

    it('applies active class when format is active', () => {
        const editor = createMockEditor({ bold: true, italic: true });
        render(<EditorBubbleMenu editor={editor as never} />);

        const boldButton = screen.getByLabelText(strings.formatting.bold);
        const italicButton = screen.getByLabelText(strings.formatting.italic);
        const strikeButton = screen.getByLabelText(strings.formatting.strikethrough);

        expect(boldButton.className).toContain('active');
        expect(italicButton.className).toContain('active');
        expect(strikeButton.className).not.toContain('active');
    });

    it('does not apply active class when format is inactive', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        const boldButton = screen.getByLabelText(strings.formatting.bold);
        expect(boldButton.className).not.toContain('active');
    });
});
