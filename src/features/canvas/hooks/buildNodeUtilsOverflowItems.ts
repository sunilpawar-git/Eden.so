/**
 * buildNodeUtilsOverflowItems — Pure helper for NodeUtilsBar overflow menu items.
 * All simple click actions (tags, image, duplicate, focus, collapse) are now rendered
 * as deck buttons via NodeUtilsBarDeckButtons. The overflow menu only hosts complex
 * sub-menus (ColorMenu, ShareMenu) which are rendered as children of OverflowMenu.
 * This function returns an empty array; it is kept as a stable contract for the
 * `useNodeUtilsBar` hook. If future sub-menu items are needed, add them here.
 */
import type { OverflowMenuItem } from '../components/nodes/OverflowMenu';

export function buildNodeUtilsOverflowItems(): OverflowMenuItem[] {
    return [];
}
