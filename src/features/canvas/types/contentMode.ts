/**
 * ContentMode — Defines how node body content is rendered.
 *
 * 'text'    → TipTap rich-text editor (default, backward compatible)
 * 'mindmap' → Markmap SVG visualization of the same markdown
 *
 * SSOT: This module is the single source of truth for content mode values.
 * The underlying data.output remains markdown in both modes — contentMode
 * only controls the rendering strategy.
 */

/** Valid content rendering modes for IdeaCard body */
export const CONTENT_MODE_VALUES = Object.freeze(['text', 'mindmap'] as const);

/** Union type derived from the SSOT constant array */
export type ContentMode = (typeof CONTENT_MODE_VALUES)[number];

/** Default mode — all existing nodes render as text */
export const DEFAULT_CONTENT_MODE: ContentMode = 'text';

/**
 * Normalize an unknown value to a valid ContentMode.
 * Returns 'text' for any unrecognized / missing value (backward compatible).
 * Mirrors the normalizeNodeColorKey pattern in node.ts.
 */
export function normalizeContentMode(value: unknown): ContentMode {
    if (typeof value !== 'string') return DEFAULT_CONTENT_MODE;
    return (CONTENT_MODE_VALUES as readonly string[]).includes(value)
        ? (value as ContentMode)
        : DEFAULT_CONTENT_MODE;
}

/**
 * Type-safe check for mindmap mode.
 * Handles undefined (legacy nodes) by returning false.
 */
export function isContentModeMindmap(mode: ContentMode | undefined): boolean {
    return mode === 'mindmap';
}
