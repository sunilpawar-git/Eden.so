/**
 * HeadingButtons — H1 / H2 / H3 toggle buttons for the bubble menu.
 * Clicking a heading button applies that level to the current selection;
 * clicking an active heading reverts to paragraph (toggle behaviour).
 * Tailwind-only (Decision 30).
 */
import React, { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { BUBBLE_BTN_BASE, BUBBLE_BTN_ACTIVE } from './EditorBubbleMenu';

interface HeadingButtonsProps {
    editor: Editor;
}

const HEADINGS = [
    { level: 1 as const, label: strings.formatting.heading1, display: strings.formatting.heading1Display },
    { level: 2 as const, label: strings.formatting.heading2, display: strings.formatting.heading2Display },
    { level: 3 as const, label: strings.formatting.heading3, display: strings.formatting.heading3Display },
] as const;

export const HeadingButtons = React.memo(function HeadingButtons({ editor }: HeadingButtonsProps) {
    const handleHeading = useCallback(
        (e: React.MouseEvent, level: 1 | 2 | 3) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleHeading({ level }).run();
        },
        [editor],
    );

    return (
        <>
            {HEADINGS.map(({ level, label, display }) => {
                const isActive = editor.isActive('heading', { level });
                return (
                    <button
                        key={level}
                        type="button"
                        aria-label={label}
                        className={`${BUBBLE_BTN_BASE}${isActive ? ` ${BUBBLE_BTN_ACTIVE}` : ''}`}
                        onMouseDown={(e) => handleHeading(e, level)}
                    >
                        {display}
                    </button>
                );
            })}
        </>
    );
});
