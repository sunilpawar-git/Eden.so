/**
 * LinkButtonItem — Link insert/edit/remove button for TipTap editor
 * Separated from EditorBubbleMenu to keep parent component under 100 lines
 */
import React, { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { SAFE_LINK_URL_START } from '../../services/linkUtils';
import styles from './EditorBubbleMenu.module.css';

interface LinkButtonItemProps {
    editor: Editor;
}

/**
 * Safely extract href from link attributes with runtime guard
 * Handles edge cases: missing attributes, null/undefined, non-object returns
 */
function getLinkHref(editor: Editor): string {
    try {
        const attrs = editor.getAttributes('link') as Record<string, unknown> | null;
        if (attrs && 'href' in attrs && typeof attrs.href === 'string') {
            return attrs.href;
        }
        return '';
    } catch {
        return '';
    }
}

/** Handle link button: toggle (unset if active) or prompt for URL */
function handleLinkAction(editor: Editor): void {
    if (editor.isActive('link')) {
        editor.chain().focus().unsetLink().run();
        return;
    }
    const existing = getLinkHref(editor);
    const url = window.prompt(strings.formatting.linkPrompt, existing);
    if (!url || !SAFE_LINK_URL_START.test(url)) return;
    editor.chain().focus().setLink({ href: url }).run();
}

export const LinkButtonItem = React.memo(function LinkButtonItem({ editor }: LinkButtonItemProps) {
    const handleLink = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleLinkAction(editor);
        },
        [editor],
    );

    return (
        <button
            type="button"
            aria-label={strings.formatting.link}
            className={`${styles.formatButton}${editor.isActive('link') ? ` ${styles.active}` : ''}`}
            onMouseDown={handleLink}
        >
            {strings.formatting.linkDisplay}
        </button>
    );
});
