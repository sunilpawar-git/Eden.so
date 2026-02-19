/**
 * Shared DOM guard utilities (SSOT)
 * Used by keyboard-shortcut hooks to detect editable targets.
 */

/**
 * Returns true when the keyboard event's target is an editable DOM element
 * (INPUT, TEXTAREA, or contentEditable). Shortcut handlers should skip
 * their logic when this returns true to avoid stealing keystrokes from
 * text inputs.
 */
export function isEditableTarget(e: KeyboardEvent): boolean {
    const target = e.target;
    if (!target || !(target instanceof HTMLElement)) return false;
    return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.contentEditable === 'true'
    );
}
