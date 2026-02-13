/**
 * Shared mock factories for useIdeaCardActions and useIdeaCardState hooks.
 * Extracted from tipTapTestMock.tsx to keep each file under 300 lines.
 */
import React from 'react';
import { vi } from 'vitest';

/** Overrides for individual action handlers */
const _actionOverrides: Record<string, (...args: unknown[]) => unknown> = {};

/** Override a specific action handler in the useIdeaCardActions mock */
export function setActionOverride(name: string, fn: (...args: unknown[]) => unknown): void {
    _actionOverrides[name] = fn;
}

/** Clear all action overrides — called from resetMockState */
export function clearActionOverrides(): void {
    Object.keys(_actionOverrides).forEach((k) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete _actionOverrides[k];
    });
}

/** useIdeaCardActions mock factory — returns module shape with configurable callbacks */
export function useIdeaCardActionsMock() {
    return {
        useIdeaCardActions: (_opts: {
            nodeId: string;
            getEditableContent: () => string;
            contentRef: React.RefObject<HTMLDivElement | null>;
        }) => {
            // Replicate the wheel-stopPropagation useEffect from the real hook
            React.useEffect(() => {
                const el = _opts.contentRef.current;
                if (!el) return;
                const h = (e: WheelEvent) => e.stopPropagation();
                el.addEventListener('wheel', h, { passive: false });
                return () => el.removeEventListener('wheel', h);
            }, [_opts.contentRef]);

            return {
                handleDelete: _actionOverrides.handleDelete ?? vi.fn(),
                handleRegenerate: _actionOverrides.handleRegenerate ?? vi.fn(),
                handleConnectClick: _actionOverrides.handleConnectClick ?? vi.fn(),
                handleTransform: _actionOverrides.handleTransform ?? vi.fn(),
                handleHeadingChange: _actionOverrides.handleHeadingChange ?? vi.fn(),
                handleCopy: _actionOverrides.handleCopy ?? vi.fn(),
                handleTagsChange: _actionOverrides.handleTagsChange ?? vi.fn(),
                isTransforming: false,
            };
        },
    };
}

/** Store reference for useIdeaCardState mock — set via initStateStore() */
let _stateStore: {
    (selector: (s: Record<string, unknown>) => unknown): unknown;
    getState: () => Record<string, unknown>;
} | null = null;

/** Initialize the canvas store reference for useIdeaCardState mock. Call in beforeEach. */
export function initStateStore(store: unknown): void {
    _stateStore = store as typeof _stateStore;
}

/** Clear state store reference — called from clearActionOverrides */
export function clearStateStore(): void {
    _stateStore = null;
}

/** useIdeaCardState mock factory — derives values from props, delegates to canvasStore */
export function useIdeaCardStateMock() {
    return {
        useIdeaCardState: (opts: {
            nodeId: string;
            prompt?: string;
            output: string | undefined;
            isAICard: boolean;
            generateFromPrompt?: (nodeId: string) => void;
        }) => {
            const getEditableContent = () => opts.output ?? '';
            if (!_stateStore) {
                return {
                    getEditableContent, saveContent: vi.fn(), placeholder: 'Type a note...',
                    onSubmitNote: vi.fn(), onSubmitAI: vi.fn(),
                };
            }
            const store = _stateStore;
            const placeholder = 'Type a note...';
            return {
                getEditableContent,
                saveContent: (md: string) => {
                    const t = md.trim();
                    const st = store.getState() as Record<string, unknown>;
                    if (t && t !== getEditableContent()) {
                        (st.updateNodeOutput as (id: string, o: string) => void)(opts.nodeId, t);
                    }
                },
                placeholder,
                onSubmitNote: (t: string) => {
                    const st = store.getState() as Record<string, unknown>;
                    (st.updateNodeOutput as (id: string, o: string) => void)(opts.nodeId, t);
                    (st.stopEditing as () => void)();
                },
                onSubmitAI: (_t: string) => {
                    const st = store.getState() as Record<string, unknown>;
                    // Heading is SSOT — no updateNodePrompt needed
                    (st.stopEditing as () => void)();
                    opts.generateFromPrompt?.(opts.nodeId);
                },
            };
        },
    };
}
