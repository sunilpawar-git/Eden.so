/** ToolbarSection — Dual-zone icon placement (UtilsBar + Context Menu). */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { UTILS_BAR_MAX, CONTEXT_MENU_MAX, getUnplacedActions } from '@/shared/stores/iconRegistry';
import { ToolbarZoneList } from './ToolbarZoneList';
import { UnplacedIconsPool } from './UnplacedIconsPool';
import { useToolbarDragDrop } from './useToolbarDragDrop';
import panelStyles from '../SettingsPanel.module.css';
import styles from './ToolbarSection.module.css';

export const ToolbarSection = React.memo(function ToolbarSection() {
    const utilsBarIcons = useSettingsStore((s) => s.utilsBarIcons);
    const contextMenuIcons = useSettingsStore((s) => s.contextMenuIcons);
    const unplacedIcons = getUnplacedActions(utilsBarIcons, contextMenuIcons);

    const {
        dragId, dropTarget, dragSourceRef,
        handleDragStart, handleDragOver, handleZoneDragOver, handleDragLeave,
        handleDragEnd, handleDrop, handleDropOnZone,
        moveUp, moveDown, removeFromZone, addToZone, resetToDefault,
    } = useToolbarDragDrop();

    const isUtilsBarFull = utilsBarIcons.length >= UTILS_BAR_MAX;
    const isContextMenuFull = contextMenuIcons.length >= CONTEXT_MENU_MAX;

    return (
        <div className={panelStyles.section}>
            <h3 className={panelStyles.sectionTitle}>{strings.settings.toolbarTitle}</h3>
            <p className={styles.description}>{strings.settings.toolbarDescription}</p>

            {/* === Zone A: UtilsBar === */}
            <div className={styles.zoneHeader}>
                <h4 className={styles.subheading}>{strings.settings.toolbarUtilsBarZone}</h4>
                <span className={styles.capacityBadge} data-full={isUtilsBarFull}>
                    {utilsBarIcons.length} / {UTILS_BAR_MAX}
                </span>
            </div>
            <p className={styles.zoneHint}>{strings.settings.toolbarUtilsBarHint}</p>
            <ToolbarZoneList zone="utilsBar" icons={utilsBarIcons} maxCapacity={UTILS_BAR_MAX}
                dragId={dragId} dropTarget={dropTarget}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                onDrop={handleDrop} onDragEnd={handleDragEnd} onZoneDragOver={handleZoneDragOver}
                onDropOnZone={handleDropOnZone} onMoveUp={moveUp} onMoveDown={moveDown} onRemove={removeFromZone} />
            <p className={styles.moreNote}>{strings.settings.toolbarMoreButton}</p>

            {/* === Zone B: Context Menu === */}
            <div className={styles.zoneHeader}>
                <h4 className={styles.subheading}>{strings.settings.toolbarContextMenuZone}</h4>
                <span className={styles.capacityBadge} data-full={isContextMenuFull}>
                    {contextMenuIcons.length} / {CONTEXT_MENU_MAX}
                </span>
            </div>
            <p className={styles.zoneHint}>{strings.settings.toolbarContextMenuHint}</p>
            <ToolbarZoneList zone="contextMenu" icons={contextMenuIcons} maxCapacity={CONTEXT_MENU_MAX}
                dragId={dragId} dropTarget={dropTarget}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                onDrop={handleDrop} onDragEnd={handleDragEnd} onZoneDragOver={handleZoneDragOver}
                onDropOnZone={handleDropOnZone} onMoveUp={moveUp} onMoveDown={moveDown} onRemove={removeFromZone} />

            {/* === Unplaced Icons === */}
            <div className={styles.zoneHeader}>
                <h4 className={styles.subheading}>{strings.settings.toolbarUnplacedZone}</h4>
            </div>
            <p className={styles.zoneHint}>{strings.settings.toolbarUnplacedHint}</p>
            <UnplacedIconsPool icons={unplacedIcons} dragId={dragId} dragSourceRef={dragSourceRef}
                isUtilsBarFull={isUtilsBarFull} isContextMenuFull={isContextMenuFull}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd} onZoneDragOver={handleZoneDragOver}
                onRemoveFromZone={removeFromZone} onAddToZone={addToZone} />

            {/* === Reset === */}
            <button className={styles.resetBtn} onClick={resetToDefault} type="button">
                {strings.settings.toolbarReset}
            </button>
        </div>
    );
});

