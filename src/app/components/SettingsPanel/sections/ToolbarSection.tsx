/** ToolbarSection — Dual-zone icon placement (UtilsBar + Context Menu). */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { UTILS_BAR_MAX, CONTEXT_MENU_MAX, getUnplacedActions } from '@/shared/stores/iconRegistry';
import { ToolbarZoneList } from './ToolbarZoneList';
import { UnplacedIconsPool } from './UnplacedIconsPool';
import { useToolbarDragDrop } from './useToolbarDragDrop';
import { SP_SECTION, SP_SECTION_STYLE, SP_SECTION_TITLE, SP_SECTION_TITLE_STYLE } from '../settingsPanelStyles';
import {
    TB_DESCRIPTION, TB_DESCRIPTION_STYLE, TB_ZONE_HEADER, TB_ZONE_HEADER_STYLE,
    TB_SUBHEADING, TB_SUBHEADING_STYLE, TB_CAPACITY_BADGE, TB_CAPACITY_BADGE_STYLE,
    TB_CAPACITY_BADGE_FULL_STYLE, TB_ZONE_HINT, TB_ZONE_HINT_STYLE,
    TB_MORE_NOTE, TB_MORE_NOTE_STYLE, TB_RESET_BTN, TB_RESET_BTN_STYLE,
} from './toolbarSectionStyles';

function ZoneHeader({ label, count, max }: { label: string; count: number; max: number }) {
    const isFull = count >= max;
    return (
        <div className={TB_ZONE_HEADER} style={TB_ZONE_HEADER_STYLE}>
            <h4 className={TB_SUBHEADING} style={TB_SUBHEADING_STYLE}>{label}</h4>
            <span className={TB_CAPACITY_BADGE}
                style={isFull ? TB_CAPACITY_BADGE_FULL_STYLE : TB_CAPACITY_BADGE_STYLE}
                data-full={isFull}>
                {count} / {max}
            </span>
        </div>
    );
}

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
        <div className={SP_SECTION} style={SP_SECTION_STYLE}>
            <h3 className={SP_SECTION_TITLE} style={SP_SECTION_TITLE_STYLE}>{strings.settings.toolbarTitle}</h3>
            <p className={TB_DESCRIPTION} style={TB_DESCRIPTION_STYLE}>{strings.settings.toolbarDescription}</p>

            <ZoneHeader label={strings.settings.toolbarUtilsBarZone} count={utilsBarIcons.length} max={UTILS_BAR_MAX} />
            <p className={TB_ZONE_HINT} style={TB_ZONE_HINT_STYLE}>{strings.settings.toolbarUtilsBarHint}</p>
            <ToolbarZoneList zone="utilsBar" icons={utilsBarIcons} maxCapacity={UTILS_BAR_MAX}
                dragId={dragId} dropTarget={dropTarget}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                onDrop={handleDrop} onDragEnd={handleDragEnd} onZoneDragOver={handleZoneDragOver}
                onDropOnZone={handleDropOnZone} onMoveUp={moveUp} onMoveDown={moveDown} onRemove={removeFromZone} />
            <p className={TB_MORE_NOTE} style={TB_MORE_NOTE_STYLE}>{strings.settings.toolbarMoreButton}</p>

            <ZoneHeader label={strings.settings.toolbarContextMenuZone} count={contextMenuIcons.length} max={CONTEXT_MENU_MAX} />
            <p className={TB_ZONE_HINT} style={TB_ZONE_HINT_STYLE}>{strings.settings.toolbarContextMenuHint}</p>
            <ToolbarZoneList zone="contextMenu" icons={contextMenuIcons} maxCapacity={CONTEXT_MENU_MAX}
                dragId={dragId} dropTarget={dropTarget}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                onDrop={handleDrop} onDragEnd={handleDragEnd} onZoneDragOver={handleZoneDragOver}
                onDropOnZone={handleDropOnZone} onMoveUp={moveUp} onMoveDown={moveDown} onRemove={removeFromZone} />

            <div className={TB_ZONE_HEADER} style={TB_ZONE_HEADER_STYLE}>
                <h4 className={TB_SUBHEADING} style={TB_SUBHEADING_STYLE}>{strings.settings.toolbarUnplacedZone}</h4>
            </div>
            <p className={TB_ZONE_HINT} style={TB_ZONE_HINT_STYLE}>{strings.settings.toolbarUnplacedHint}</p>
            <UnplacedIconsPool icons={unplacedIcons} dragId={dragId} dragSourceRef={dragSourceRef}
                isUtilsBarFull={isUtilsBarFull} isContextMenuFull={isContextMenuFull}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd} onZoneDragOver={handleZoneDragOver}
                onRemoveFromZone={removeFromZone} onAddToZone={addToZone} />

            <button className={TB_RESET_BTN} style={TB_RESET_BTN_STYLE} onClick={resetToDefault} type="button">
                {strings.settings.toolbarReset}
            </button>
        </div>
    );
});
