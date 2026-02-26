/**
 * useEscapeLayer — Centralized, priority-aware Escape key handling.
 *
 * Multiple layers can register concurrently. When Escape is pressed,
 * only the highest-priority active handler fires (dismiss-from-top pattern).
 *
 * Registration: each call to useEscapeLayer(priority, active, handler)
 * adds/removes the handler from a global ordered set. The single
 * document-level listener invokes the top handler and stops.
 */
import { useEffect, useRef } from 'react';
import type { EscapePriority } from './escapePriorities';

interface EscapeEntry {
    priority: EscapePriority;
    handler: () => void;
    id: number;
}

let nextId = 0;
const entries: EscapeEntry[] = [];

function insertEntry(entry: EscapeEntry): void {
    entries.push(entry);
    entries.sort((a, b) => b.priority - a.priority || b.id - a.id);
}

function removeEntry(id: number): void {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx !== -1) entries.splice(idx, 1);
}

function handleGlobalEscape(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    const top = entries[0];
    if (!top) return;
    e.stopPropagation();
    top.handler();
}

let listenerAttached = false;

function ensureListener(): void {
    if (listenerAttached) return;
    document.addEventListener('keydown', handleGlobalEscape);
    listenerAttached = true;
}

function maybeRemoveListener(): void {
    if (entries.length > 0) return;
    document.removeEventListener('keydown', handleGlobalEscape);
    listenerAttached = false;
}

/**
 * Register an Escape key handler at the given priority level.
 * @param priority - Numeric priority from ESCAPE_PRIORITY constants.
 * @param active - Whether this layer is currently active (e.g. panel is open).
 * @param handler - Callback invoked when this is the top-priority Escape target.
 */
export function useEscapeLayer(
    priority: EscapePriority,
    active: boolean,
    handler: () => void,
): void {
    const idRef = useRef<number | null>(null);
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!active) return;

        const id = nextId++;
        idRef.current = id;

        const entry: EscapeEntry = {
            priority,
            handler: () => handlerRef.current(),
            id,
        };

        insertEntry(entry);
        ensureListener();

        return () => {
            removeEntry(id);
            idRef.current = null;
            maybeRemoveListener();
        };
    }, [priority, active]);
}

/** Visible for testing — returns a snapshot of current active entry count. */
export function _getActiveEntryCount(): number {
    return entries.length;
}

/** Visible for testing — clears all entries and removes the listener. */
export function _resetEscapeLayer(): void {
    entries.length = 0;
    if (listenerAttached) {
        document.removeEventListener('keydown', handleGlobalEscape);
        listenerAttached = false;
    }
    nextId = 0;
}
