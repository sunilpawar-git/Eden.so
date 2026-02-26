/**
 * buildNodeUtilsOverflowItems — Pure helper for NodeUtilsBar overflow menu items.
 * Extracted for max-lines-per-function lint rule.
 */
import { strings } from '@/shared/localization/strings';
import type { OverflowMenuItem } from '../components/nodes/OverflowMenu';

export function buildNodeUtilsOverflowItems(p: {
    onTagClick: () => void;
    onImageClick?: () => void;
    onDuplicateClick?: () => void;
    onFocusClick?: () => void;
    onCollapseToggle?: () => void;
    isCollapsed: boolean;
}): OverflowMenuItem[] {
    const items: OverflowMenuItem[] = [
        { id: 'tags', label: strings.nodeUtils.tags, icon: '🏷️', onClick: p.onTagClick },
    ];
    if (p.onImageClick) {
        items.push({ id: 'image', label: strings.nodeUtils.image, icon: '🖼️', onClick: p.onImageClick });
    }
    if (p.onDuplicateClick) {
        items.push({ id: 'duplicate', label: strings.nodeUtils.duplicate, icon: '📑', onClick: p.onDuplicateClick });
    }
    if (p.onFocusClick) {
        items.push({ id: 'focus', label: strings.nodeUtils.focus, icon: '🔍', onClick: p.onFocusClick });
    }
    if (p.onCollapseToggle) {
        const label = p.isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse;
        const icon = p.isCollapsed ? '▴' : '▾';
        items.push({ id: 'collapse', label, icon, onClick: p.onCollapseToggle });
    }
    return items;
}
