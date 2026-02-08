/**
 * Shared mock registrations for IdeaCard test files.
 * Centralizes ReactFlow, AI generation, and MarkdownRenderer mocks.
 *
 * Usage: import in test file, then call registerIdeaCardMocks(vi, mockGenerateFromPrompt)
 * NOTE: Because vi.mock is hoisted, callers must still call vi.mock directly.
 *       This file provides the mock props/data shared across test files.
 */
import type { IdeaNodeData } from '../../../../types/node';

/** Standard default IdeaNodeData for tests */
export const defaultTestData: IdeaNodeData = {
    prompt: '',
    output: undefined,
    isGenerating: false,
    isPromptCollapsed: false,
};

/** Standard default NodeProps for IdeaCard tests */
export const defaultTestProps = {
    id: 'idea-1',
    data: defaultTestData,
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
