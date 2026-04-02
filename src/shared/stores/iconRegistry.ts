/**
 * Icon Registry — Unified SSOT for all node action icons.
 * Covers both Hover Menu (Zone A, max 6) and Right-click Menu (Zone B, max 11).
 *
 * Each action has a stable ID, icon, label thunk, group membership,
 * and zone constraints. Separated from settingsStore per SRP.
 */
import { strings } from '@/shared/localization/strings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Every assignable action (excludes 'more' which is pinned to Hover Menu) */
export type ActionId =
    | 'ai' | 'connect' | 'copy' | 'delete'
    | 'pin' | 'duplicate' | 'collapse' | 'focus'
    | 'tags' | 'color' | 'image' | 'attachment'
    | 'share' | 'pool' | 'mindmap';

/** Group labels for visual organisation in the context menu */
export type ActionGroup = 'primary' | 'organize' | 'appearance' | 'insert' | 'sharing';

/** Metadata for a single action icon */
export interface ActionMeta {
    readonly id: ActionId;
    readonly icon: string;
    readonly label: () => string;
    readonly shortcut?: () => string;
    readonly group: ActionGroup;
    /** If true, this action cannot be removed from BOTH zones (must be in one) */
    readonly required: boolean;
}

// ---------------------------------------------------------------------------
// Registry (exhaustive, static)
// ---------------------------------------------------------------------------

export const ACTION_REGISTRY: ReadonlyMap<ActionId, ActionMeta> = new Map([
    // Primary actions
    ['ai',         { id: 'ai',         icon: '✨',  label: () => strings.nodeUtils.aiActions,   group: 'primary',    required: false }],
    ['connect',    { id: 'connect',    icon: '🔗',  label: () => strings.nodeUtils.connect,     group: 'primary',    required: false }],
    ['copy',       { id: 'copy',       icon: '📋',  label: () => strings.nodeUtils.copy,        group: 'primary',    required: false, shortcut: () => strings.nodeUtils.copyShortcut }],
    ['delete',     { id: 'delete',     icon: '🗑️',  label: () => strings.nodeUtils.delete,      group: 'primary',    required: true,  shortcut: () => strings.nodeUtils.deleteShortcut }],
    // Organize
    ['pin',        { id: 'pin',        icon: '📌',  label: () => strings.nodeUtils.pin,         group: 'organize',   required: false }],
    ['duplicate',  { id: 'duplicate',  icon: '📑',  label: () => strings.nodeUtils.duplicate,   group: 'organize',   required: false }],
    ['collapse',   { id: 'collapse',   icon: '🔼',  label: () => strings.nodeUtils.collapse,    group: 'organize',   required: false }],
    ['focus',      { id: 'focus',      icon: '🔍',  label: () => strings.nodeUtils.focus,       group: 'organize',   required: false }],
    // Appearance
    ['tags',       { id: 'tags',       icon: '🏷️',  label: () => strings.nodeUtils.tags,        group: 'appearance', required: false }],
    ['color',      { id: 'color',      icon: '🎨',  label: () => strings.nodeUtils.color,       group: 'appearance', required: false }],
    ['mindmap',    { id: 'mindmap',    icon: '🗺️',  label: () => strings.nodeUtils.mindmapView, group: 'appearance', required: false }],
    // Insert
    ['image',      { id: 'image',      icon: '🖼️',  label: () => strings.nodeUtils.image,       group: 'insert',    required: false }],
    ['attachment',  { id: 'attachment', icon: '📎',  label: () => strings.nodeUtils.attachment,  group: 'insert',    required: false }],
    // Sharing
    ['share',      { id: 'share',      icon: '📤',  label: () => strings.nodeUtils.share,       group: 'sharing',   required: false }],
    ['pool',       { id: 'pool',       icon: '🧠',  label: () => strings.nodePool.addToPool,    group: 'sharing',   required: false }],
]);

/** All valid action IDs for O(1) lookup */
export const ALL_ACTION_IDS: readonly ActionId[] = [...ACTION_REGISTRY.keys()];
const VALID_IDS: ReadonlySet<string> = new Set(ALL_ACTION_IDS);

// ---------------------------------------------------------------------------
// Capacity limits
// ---------------------------------------------------------------------------

export const HOVER_MENU_MAX = 6;
export const RIGHT_CLICK_MENU_MAX = 11;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Default Hover Menu icons (max 6 — 5 actions + 'more' is rendered separately) */
export const DEFAULT_HOVER_MENU: readonly ActionId[] = ['ai', 'connect', 'copy', 'delete'];

/** Default Right-click Menu icons */
export const DEFAULT_RIGHT_CLICK_MENU: readonly ActionId[] = [
    'pin', 'duplicate', 'collapse', 'focus',
    'tags', 'color', 'mindmap',
    'image', 'attachment',
    'share', 'pool',
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate and sanitise a persisted action ID array, enforcing capacity. */
export function validateActionList(raw: unknown, maxCapacity: number): ActionId[] {
    if (!Array.isArray(raw)) return [];

    const seen = new Set<string>();
    const result: ActionId[] = [];

    for (const item of raw) {
        if (typeof item === 'string' && VALID_IDS.has(item) && !seen.has(item)) {
            if (result.length >= maxCapacity) break;
            seen.add(item);
            result.push(item as ActionId);
        }
    }
    return result;
}

/**
 * Full validation: load persisted hoverMenu + rightClickMenu, fill missing
 * required actions, ensure no duplicates across zones.
 * If both inputs are null/non-array (first launch), returns defaults.
 */
export function validatePlacement(
    rawHoverMenu: unknown,
    rawRightClickMenu: unknown,
): { hoverMenu: ActionId[]; rightClickMenu: ActionId[] } {
    // If neither zone has persisted data, return defaults (first launch)
    const hasHoverMenu = Array.isArray(rawHoverMenu);
    const hasRightClickMenu = Array.isArray(rawRightClickMenu);
    if (!hasHoverMenu && !hasRightClickMenu) {
        return { hoverMenu: [...DEFAULT_HOVER_MENU], rightClickMenu: [...DEFAULT_RIGHT_CLICK_MENU] };
    }

    const hoverMenu = validateActionList(rawHoverMenu, HOVER_MENU_MAX);
    const rightClickMenu = validateActionList(rawRightClickMenu, RIGHT_CLICK_MENU_MAX);

    // Remove cross-zone duplicates (Hover Menu wins)
    const hoverSet = new Set(hoverMenu);
    const dedupedContext = rightClickMenu.filter((id) => !hoverSet.has(id));

    // Ensure required actions are present in at least one zone
    const allPlaced = new Set([...hoverMenu, ...dedupedContext]);
    for (const [id, meta] of ACTION_REGISTRY) {
        if (meta.required && !allPlaced.has(id)) {
            // Place in Hover Menu if room, else Right-click Menu
            if (hoverMenu.length < HOVER_MENU_MAX) {
                hoverMenu.push(id);
            } else if (dedupedContext.length < RIGHT_CLICK_MENU_MAX) {
                dedupedContext.push(id);
            }
        }
    }

    return { hoverMenu, rightClickMenu: dedupedContext };
}

/**
 * Return the IDs that are not placed in either zone (available for assignment).
 */
export function getUnplacedActions(
    hoverMenu: readonly ActionId[],
    rightClickMenu: readonly ActionId[],
): ActionId[] {
    const placed = new Set([...hoverMenu, ...rightClickMenu]);
    return ALL_ACTION_IDS.filter((id) => !placed.has(id));
}
