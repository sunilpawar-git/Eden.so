/**
 * UnplacedIconsPool — Renders the pool of unplaced (hidden) icons in the ToolbarSection.
 * Extracted from ToolbarSection to stay under max-lines-per-function.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { ACTION_REGISTRY, type ActionId } from '@/shared/stores/iconRegistry';
import { type ZoneId } from './IconItem';
import styles from './ToolbarSection.module.css';

interface UnplacedIconsPoolProps {
    readonly icons: ActionId[];
    readonly dragId: ActionId | null;
    readonly dragSourceRef: React.RefObject<ZoneId | null>;
    readonly isUtilsBarFull: boolean;
    readonly isContextMenuFull: boolean;
    readonly onDragStart: (id: ActionId, zone: ZoneId) => void;
    readonly onDragEnd: () => void;
    readonly onZoneDragOver: (e: React.DragEvent) => void;
    readonly onRemoveFromZone: (zone: ZoneId, id: ActionId) => void;
    readonly onAddToZone: (zone: ZoneId, id: ActionId) => void;
}

export function UnplacedIconsPool({
    icons, dragId, dragSourceRef, isUtilsBarFull, isContextMenuFull,
    onDragStart, onDragEnd, onZoneDragOver, onRemoveFromZone, onAddToZone,
}: UnplacedIconsPoolProps) {
    return (
        <div
            className={`${styles.hiddenZone} ${dragId ? styles.hiddenZoneActive : ''}`}
            onDragOver={onZoneDragOver}
            onDrop={() => {
                if (dragId && dragSourceRef.current) {
                    onRemoveFromZone(dragSourceRef.current, dragId);
                }
                onDragEnd();
            }}
            data-testid="toolbar-unplaced-list"
        >
            {icons.length === 0 ? (
                <span className={styles.emptyHint}>{strings.settings.toolbarNoUnplaced}</span>
            ) : (
                icons.map((id) => {
                    const meta = ACTION_REGISTRY.get(id);
                    if (!meta) return null;
                    return (
                        <div
                            key={id}
                            className={`${styles.hiddenItem} ${dragId === id ? styles.dragging : ''}`}
                            draggable
                            onDragStart={() => onDragStart(id, 'unplaced')}
                            onDragEnd={onDragEnd}
                            data-testid={`toolbar-unplaced-${id}`}
                        >
                            <span className={styles.buttonIcon}>{meta.icon}</span>
                            <span className={styles.buttonLabel}>{meta.label()}</span>
                            <span className={styles.addButtons}>
                                <button
                                    className={styles.addBtn}
                                    onClick={() => onAddToZone('utilsBar', id)}
                                    disabled={isUtilsBarFull}
                                    title={`Add to ${strings.settings.toolbarUtilsBarZone}`}
                                    type="button"
                                >
                                    + Bar
                                </button>
                                <button
                                    className={styles.addBtn}
                                    onClick={() => onAddToZone('contextMenu', id)}
                                    disabled={isContextMenuFull}
                                    title={`Add to ${strings.settings.toolbarContextMenuZone}`}
                                    type="button"
                                >
                                    + Menu
                                </button>
                            </span>
                        </div>
                    );
                })
            )}
        </div>
    );
}
