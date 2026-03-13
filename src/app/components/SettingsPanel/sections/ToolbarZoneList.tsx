/**
 * ToolbarZoneList — Renders a single icon zone (UtilsBar or ContextMenu) in the ToolbarSection.
 * Extracted from ToolbarSection to stay under max-lines-per-function.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { type ActionId } from '@/shared/stores/iconRegistry';
import { IconItem, type ZoneId } from './IconItem';
import styles from './ToolbarSection.module.css';

interface ToolbarZoneListProps {
    readonly zone: ZoneId;
    readonly icons: ActionId[];
    readonly maxCapacity: number;
    readonly dragId: ActionId | null;
    readonly dropTarget: { zone: ZoneId; index: number } | null;
    readonly onDragStart: (id: ActionId, zone: ZoneId) => void;
    readonly onDragOver: (e: React.DragEvent, zone: ZoneId, index: number) => void;
    readonly onDragLeave: () => void;
    readonly onDrop: (zone: ZoneId, index: number) => void;
    readonly onDragEnd: () => void;
    readonly onZoneDragOver: (e: React.DragEvent) => void;
    readonly onDropOnZone: (zone: ZoneId) => void;
    readonly onMoveUp: (zone: ZoneId, id: ActionId) => void;
    readonly onMoveDown: (zone: ZoneId, id: ActionId) => void;
    readonly onRemove: (zone: ZoneId, id: ActionId) => void;
}

export function ToolbarZoneList({
    zone, icons, maxCapacity, dragId, dropTarget,
    onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
    onZoneDragOver, onDropOnZone, onMoveUp, onMoveDown, onRemove,
}: ToolbarZoneListProps) {
    const isFull = icons.length >= maxCapacity;

    return (
        <div
            className={`${styles.buttonList} ${dragId && !isFull ? styles.dropZoneActive : ''}`}
            onDragOver={onZoneDragOver}
            onDrop={() => onDropOnZone(zone)}
            data-testid={`toolbar-${zone === 'utilsBar' ? 'utilsbar' : 'contextmenu'}-list`}
        >
            {icons.length === 0 && (
                <span className={styles.emptyHint}>{strings.settings.toolbarEmpty}</span>
            )}
            {icons.map((id, index) => (
                <IconItem
                    key={id}
                    id={id}
                    zone={zone}
                    index={index}
                    total={icons.length}
                    isDragging={dragId === id}
                    isDropTarget={dropTarget?.zone === zone && dropTarget.index === index}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
}
