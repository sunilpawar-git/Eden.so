/**
 * Tag Types - Type definitions for tagging system
 * BASB: Organize and categorize captured ideas
 */

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export const DEFAULT_TAG_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#84cc16', // lime
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#d946ef', // fuchsia
] as const;

export function createTag(name: string, color?: string): Tag {
    return {
        id: `tag-${Date.now()}`,
        name: name.trim().toLowerCase(),
        color: color ?? DEFAULT_TAG_COLORS[Math.floor(Math.random() * DEFAULT_TAG_COLORS.length)] ?? '#3b82f6',
    };
}
