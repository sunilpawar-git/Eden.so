/**
 * Tag Types - Type definitions for tagging system
 * BASB: Organize and categorize captured ideas
 */

export interface Tag {
    id: string;
    name: string;
    color: string;
}

const TAG_COLOR_VARS = [
    '--tag-red', '--tag-orange', '--tag-amber', '--tag-lime', '--tag-green',
    '--tag-teal', '--tag-cyan', '--tag-blue', '--tag-violet', '--tag-fuchsia',
] as const;

const FALLBACK_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
] as const;

function resolveTagColors(): string[] {
    if (typeof document === 'undefined') return [...FALLBACK_COLORS];
    const root = getComputedStyle(document.documentElement);
    return TAG_COLOR_VARS.map((v, i) => root.getPropertyValue(v).trim() || (FALLBACK_COLORS[i] ?? '#3b82f6'));
}

let cachedColors: string[] | null = null;
export function getTagColors(): string[] {
    cachedColors ??= resolveTagColors();
    return cachedColors;
}

/** @deprecated Use getTagColors() for CSS-variable-aware colors */
export const DEFAULT_TAG_COLORS = FALLBACK_COLORS;

function pickRandomTagColor(): string {
    const colors = getTagColors();
    return colors[Math.floor(Math.random() * colors.length)] ?? '#3b82f6';
}

export function createTag(name: string, color?: string): Tag {
    return {
        id: `tag-${Date.now()}`,
        name: name.trim().toLowerCase(),
        color: color ?? pickRandomTagColor(),
    };
}
