/**
 * Shared TipTap mock state and factories for IdeaCard tests.
 * Centralizes duplicated mock boilerplate into a single source of truth.
 *
 * Usage in test files (async vi.mock factories):
 *   vi.mock('../../../hooks/useTipTapEditor', async () =>
 *       (await import('./helpers/tipTapTestMock')).hookMock()
 *   );
 *   vi.mock('../TipTapEditor', async () =>
 *       (await import('./helpers/tipTapTestMock')).componentMock()
 *   );
 *   // In beforeEach:
 *   const { resetMockState } = await import('./helpers/tipTapTestMock');
 *   resetMockState();
 */
import React from 'react';

/** Shared mutable state — singleton across all mock factories in a test file */
const state = {
    content: '',
    onBlur: null as ((md: string) => void) | null,
    onUpdate: null as ((md: string) => void) | null,
    placeholder: '',
    domElement: null as HTMLElement | null,
    lastInitialContent: undefined as string | undefined,
    focusAtEndCallCount: 0,
    insertedChars: [] as string[],
};

/** Reset mock state to initial values — call in beforeEach */
export function resetMockState(): void {
    state.content = '';
    state.onBlur = null;
    state.onUpdate = null;
    state.placeholder = '';
    state.domElement = null;
    state.lastInitialContent = undefined;
    state.focusAtEndCallCount = 0;
    state.insertedChars = [];
}

/** Get count of focusAtEnd calls since last reset */
export function getFocusAtEndCallCount(): number {
    return state.focusAtEndCallCount;
}

/** Get characters inserted via insertContent since last reset */
export function getInsertedChars(): string[] {
    return [...state.insertedChars];
}

/** SlashCommandSuggestion extension mock — returns module shape */
export function extensionMock() {
    return {
        SlashCommandSuggestion: { configure: () => ({}) },
        createSlashSuggestionRender: () => () => ({}),
    };
}

/** useTipTapEditor mock factory — returns module shape */
export function hookMock() {
    return {
        useTipTapEditor: (options: {
            initialContent: string;
            placeholder: string;
            editable?: boolean;
            onBlur?: (md: string) => void;
            onUpdate?: (md: string) => void;
            extraExtensions?: unknown[];
        }) => {
            if (options.initialContent !== state.lastInitialContent) {
                state.content = options.initialContent || '';
                state.lastInitialContent = options.initialContent;
            }
            state.onBlur = options.onBlur ?? null;
            state.onUpdate = options.onUpdate ?? null;
            state.placeholder = options.placeholder || '';
            return {
                editor: {
                    view: { get dom() { return state.domElement ?? document.createElement('div'); } },
                    isEmpty: !state.content,
                    commands: {
                        insertContent: (text: string) => {
                            state.insertedChars.push(text);
                            state.content += text;
                        },
                    },
                },
                getMarkdown: () => state.content,
                getText: () => state.content,
                isEmpty: !state.content,
                setContent: (md: string) => { state.content = md; },
                focusAtEnd: () => { state.focusAtEndCallCount++; },
            };
        },
    };
}

/** useIdeaCardEditor mock factory — returns module shape with shared state */
export function useIdeaCardEditorMock() {
    return {
        useIdeaCardEditor: (opts: {
            isEditing: boolean;
            output?: string;
            getEditableContent: () => string;
            placeholder: string;
            saveContent: (md: string) => void;
            onExitEditing: () => void;
            onSlashCommand: (id: string) => void;
        }) => {
            const display = opts.isEditing ? opts.getEditableContent() : (opts.output ?? '');
            if (display !== state.lastInitialContent) {
                state.content = display || '';
                state.lastInitialContent = display;
            }
            state.placeholder = opts.placeholder || '';
            state.onBlur = (md: string) => {
                opts.saveContent(md);
                opts.onExitEditing();
            };
            return {
                editor: {
                    view: { get dom() { return state.domElement ?? document.createElement('div'); } },
                    isEmpty: !state.content,
                    commands: {
                        insertContent: (text: string) => {
                            state.insertedChars.push(text);
                            state.content += text;
                        },
                    },
                },
                getMarkdown: () => state.content,
                setContent: (md: string) => { state.content = md; },
                focusAtEnd: () => { state.focusAtEndCallCount++; },
                suggestionActiveRef: { current: false },
            };
        },
    };
}

/** useIdeaCardKeyboard mock factory — simulates real behavior via captured callbacks */
export function useIdeaCardKeyboardMock() {
    return {
        useIdeaCardKeyboard: (opts: {
            editor: unknown; isEditing: boolean; isGenerating: boolean;
            inputMode: string; getMarkdown: () => string;
            setContent: (md: string) => void; getEditableContent: () => string;
            suggestionActiveRef: { current: boolean };
            saveContent: (md: string) => void; onExitEditing: () => void;
            onEnterEditing: () => void;
            onSubmitNote: (t: string) => void; onSubmitAI: (t: string) => void;
        }) => ({
            handleContentDoubleClick: () => {
                if (opts.isGenerating) return;
                opts.setContent(opts.getEditableContent());
                opts.onEnterEditing();
            },
            handleContentKeyDown: (e: { key: string; preventDefault?: () => void;
                ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }) => {
                if (opts.isGenerating) return;
                if (e.key === 'Enter') {
                    e.preventDefault?.();
                    opts.setContent(opts.getEditableContent());
                    opts.onEnterEditing();
                    return;
                }
                const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
                if (isPrintable) {
                    opts.setContent(opts.getEditableContent());
                    opts.onEnterEditing();
                    const ed = opts.editor as { commands: { insertContent: (t: string) => void } };
                    ed.commands.insertContent(e.key);
                }
            },
        }),
    };
}

/** TipTapEditor component mock factory — returns module shape */
export function componentMock() {
    return {
        TipTapEditor: ({ 'data-testid': testId }: { 'data-testid'?: string }) => {
            const isViewMode = testId === 'view-editor';
            if (isViewMode) {
                return (
                    <div data-testid={testId}
                        ref={(el: HTMLDivElement | null) => { if (el) state.domElement = el; }}>
                        {state.content}
                    </div>
                );
            }
            return (
                <textarea
                    ref={(el: HTMLTextAreaElement | null) => { if (el) state.domElement = el; }}
                    data-testid={testId ?? 'tiptap-editor'}
                    placeholder={state.placeholder}
                    defaultValue={state.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        state.content = e.target.value;
                        state.onUpdate?.(e.target.value);
                    }}
                    onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                        state.onBlur?.(e.currentTarget.value);
                    }}
                />
            );
        },
    };
}
