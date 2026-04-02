/**
 * useToolbarDragDrop — All drag-and-drop + reorder logic for ToolbarSection.
 * Extracted to keep ToolbarSection under max-lines-per-function.
 */
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ACTION_REGISTRY, HOVER_MENU_MAX, RIGHT_CLICK_MENU_MAX, type ActionId } from '@/shared/stores/iconRegistry';
import { type ZoneId } from './IconItem';

/* ── Stateless helpers (no hooks — read store directly) ── */

function swapItems(zone: ZoneId, id: ActionId, dir: -1 | 1) {
    const s = useSettingsStore.getState();
    const list = zone === 'hoverMenu' ? [...s.hoverMenuIcons] : [...s.rightClickMenuIcons];
    const idx = list.indexOf(id);
    const adj = idx + dir;
    if (idx === -1 || adj < 0 || adj >= list.length) return;
    const a = list[idx]; const b = list[adj];
    if (a === undefined || b === undefined) return;
    list[idx] = b; list[adj] = a;
    if (zone === 'hoverMenu') s.setHoverMenuIcons(list); else s.setRightClickMenuIcons(list);
}

function doRemove(zone: ZoneId, id: ActionId) {
    const s = useSettingsStore.getState();
    const meta = ACTION_REGISTRY.get(id);
    if (meta?.required && !(zone === 'hoverMenu' ? s.rightClickMenuIcons : s.hoverMenuIcons).includes(id)) return;
    if (zone === 'hoverMenu') s.setHoverMenuIcons(s.hoverMenuIcons.filter((i) => i !== id));
    else if (zone === 'rightClickMenu') s.setRightClickMenuIcons(s.rightClickMenuIcons.filter((i) => i !== id));
}

function doAdd(zone: ZoneId, id: ActionId) {
    const s = useSettingsStore.getState();
    if (zone === 'hoverMenu' && s.hoverMenuIcons.length < HOVER_MENU_MAX) s.setHoverMenuIcons([...s.hoverMenuIcons, id]);
    else if (zone === 'rightClickMenu' && s.rightClickMenuIcons.length < RIGHT_CLICK_MENU_MAX) s.setRightClickMenuIcons([...s.rightClickMenuIcons, id]);
}

function doReset() { useSettingsStore.getState().resetIconPlacement(); }

/* ── Hook (drag state + drop logic only) ── */

export function useToolbarDragDrop() {
    const [dragId, setDragId] = useState<ActionId | null>(null);
    const [dropTarget, setDropTarget] = useState<{ zone: ZoneId; index: number } | null>(null);
    const dragSourceRef = useRef<ZoneId | null>(null);

    const handleDragStart = useCallback((id: ActionId, source: ZoneId) => {
        setDragId(id); dragSourceRef.current = source;
    }, []);
    const handleDragOver = useCallback((e: React.DragEvent, zone: ZoneId, index: number) => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget({ zone, index });
    }, []);
    const handleZoneDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    }, []);
    const handleDragLeave = useCallback(() => { setDropTarget(null); }, []);
    const handleDragEnd = useCallback(() => {
        setDragId(null); setDropTarget(null); dragSourceRef.current = null;
    }, []);

    const handleDrop = useCallback((tz: ZoneId, ti: number) => {
        if (!dragId) return;
        const s = useSettingsStore.getState();
        const src = dragSourceRef.current;
        let bar = [...s.hoverMenuIcons]; let menu = [...s.rightClickMenuIcons];
        if (src === 'hoverMenu') bar = bar.filter((i) => i !== dragId);
        else if (src === 'rightClickMenu') menu = menu.filter((i) => i !== dragId);
        if (tz === 'hoverMenu') {
            if (bar.length >= HOVER_MENU_MAX && src !== 'hoverMenu') { handleDragEnd(); return; }
            bar.splice(ti, 0, dragId);
        } else if (tz === 'rightClickMenu') {
            if (menu.length >= RIGHT_CLICK_MENU_MAX && src !== 'rightClickMenu') { handleDragEnd(); return; }
            menu.splice(ti, 0, dragId);
        }
        s.setHoverMenuIcons(bar); s.setRightClickMenuIcons(menu); handleDragEnd();
    }, [dragId, handleDragEnd]);

    const handleDropOnZone = useCallback((zone: ZoneId) => {
        const s = useSettingsStore.getState();
        handleDrop(zone, zone === 'hoverMenu' ? s.hoverMenuIcons.length : s.rightClickMenuIcons.length);
    }, [handleDrop]);

    return {
        dragId, dropTarget, dragSourceRef,
        handleDragStart, handleDragOver, handleZoneDragOver, handleDragLeave,
        handleDragEnd, handleDrop, handleDropOnZone,
        moveUp: (z: ZoneId, id: ActionId) => swapItems(z, id, -1),
        moveDown: (z: ZoneId, id: ActionId) => swapItems(z, id, 1),
        removeFromZone: doRemove, addToZone: doAdd, resetToDefault: doReset,
    };
}
