/**
 * Shared test fixtures for useNodeInput test files.
 * SSOT: avoids duplicating createMockNode / createMockEditor / baseOpts.
 */
import { vi } from 'vitest';
import type { CanvasNode } from '../../types/node';
import type { UseNodeInputOptions } from '../useNodeInput';

export const NODE_ID = 'node-1';

export const createMockNode = (id: string): CanvasNode => ({
    id, workspaceId: 'ws-1', type: 'idea',
    position: { x: 0, y: 0 },
    data: { prompt: '', output: 'existing content', tags: [] },
    createdAt: new Date(), updatedAt: new Date(),
});

export const createMockEditor = () => {
    const mockTr = { insertText: vi.fn().mockReturnThis() };
    return {
        view: {
            dom: document.createElement('div'),
            state: { selection: { from: 0, to: 0 }, tr: mockTr },
            dispatch: vi.fn(),
        },
        commands: { insertContent: vi.fn(), focus: vi.fn(), setContent: vi.fn() },
        setEditable: vi.fn(),
        getHTML: vi.fn(() => '<p>test</p>'),
        isEmpty: false,
    };
};

export const buildBaseOpts = (
    editor: ReturnType<typeof createMockEditor>,
    overrides: Partial<UseNodeInputOptions> = {},
): UseNodeInputOptions => ({
    nodeId: NODE_ID,
    editor: editor as never,
    getMarkdown: vi.fn(() => ''),
    setContent: vi.fn(),
    getEditableContent: vi.fn(() => 'existing content'),
    saveContent: vi.fn(),
    isGenerating: false,
    submitHandlerRef: { current: null },
    isNewEmptyNode: false,
    isEditing: false,
    ...overrides,
});
