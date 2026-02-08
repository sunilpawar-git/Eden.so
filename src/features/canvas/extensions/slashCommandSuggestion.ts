/**
 * SlashCommandSuggestion - TipTap extension for "/" slash commands
 * Uses @tiptap/suggestion to detect "/" trigger and render popup
 */
import { Extension, type Editor } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { filterCommands } from '../services/slashCommands';
import type { SlashCommand, SlashCommandId } from '../types/slashCommand';
import { SlashCommandList, type SlashCommandListRef } from '../components/nodes/SlashCommandList';

export type OnSlashCommandSelect = (id: SlashCommandId) => void;

interface SlashCommandSuggestionOptions {
    suggestion: Partial<SuggestionOptions<SlashCommand>>;
}

export const SlashCommandSuggestion = Extension.create<SlashCommandSuggestionOptions>({
    name: 'slashCommandSuggestion',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                startOfLine: true,
                items: ({ query }) => filterCommands(query),
                command: ({ editor: ed, range }: { editor: Editor; range: { from: number; to: number } }) => {
                    ed.chain().focus().deleteRange(range).run();
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

interface SlashSuggestionRenderOptions {
    onSelect: OnSlashCommandSelect;
    onActiveChange?: (active: boolean) => void;
}

/** Create the suggestion render config that mounts SlashCommandList via React */
export function createSlashSuggestionRender(
    options: SlashSuggestionRenderOptions,
): NonNullable<SuggestionOptions<SlashCommand>['render']> {
    const { onSelect, onActiveChange } = options;
    return () => {
        let renderer: ReactRenderer<SlashCommandListRef> | null = null;
        let popup: HTMLDivElement | null = null;

        return {
            onStart(props) {
                onActiveChange?.(true);
                renderer = new ReactRenderer(SlashCommandList, {
                    props: {
                        items: props.items,
                        command: (item: SlashCommand) => {
                            props.command(item);
                            onSelect(item.id);
                        },
                    },
                    editor: props.editor,
                });

                popup = document.createElement('div');
                popup.style.position = 'absolute';
                popup.style.zIndex = '9999';
                popup.appendChild(renderer.element);
                document.body.appendChild(popup);

                updatePosition(popup, props.clientRect);
            },
            onUpdate(props) {
                renderer?.updateProps({
                    items: props.items,
                    command: (item: SlashCommand) => {
                        props.command(item);
                        onSelect(item.id);
                    },
                });
                updatePosition(popup, props.clientRect);
            },
            onKeyDown(props) {
                if (props.event.key === 'Escape') return false;
                return renderer?.ref?.onKeyDown(props) ?? false;
            },
            onExit() {
                onActiveChange?.(false);
                renderer?.destroy();
                renderer = null;
                popup?.remove();
                popup = null;
            },
        };
    };
}

/** Position popup below the cursor using clientRect from suggestion props */
function updatePosition(
    popup: HTMLDivElement | null,
    clientRect: (() => DOMRect | null) | null | undefined,
): void {
    if (!popup || !clientRect) return;
    const rect = clientRect();
    if (!rect) return;
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
}
