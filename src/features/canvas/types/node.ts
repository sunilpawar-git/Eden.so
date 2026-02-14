/**
 * Node Model - Type definitions for canvas nodes
 */

/**
 * Node dimension constraints (in pixels)
 * SSOT: These constants are the single source of truth for node sizing
 * @see nodeDimensionSync.test.ts - Automated test validates CSS/TS sync
 */
export const MIN_NODE_WIDTH = 180;
export const MAX_NODE_WIDTH = 900;
export const MIN_NODE_HEIGHT = 100;
export const MAX_NODE_HEIGHT = 800;

export const DEFAULT_NODE_WIDTH = 280;
export const DEFAULT_NODE_HEIGHT = 220;

/** Resize increment per arrow click (96px = 1 CSS inch = 6 grid snaps) */
export const RESIZE_INCREMENT_PX = 96;

/**
 * Clamp dimensions to valid bounds
 * Pure utility function for dimension validation
 */
export function clampNodeDimensions(
    width: number,
    height: number
): { width: number; height: number } {
    return {
        width: Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, width)),
        height: Math.max(MIN_NODE_HEIGHT, Math.min(MAX_NODE_HEIGHT, height)),
    };
}

/**
 * Node types - 'idea' is the primary type for IdeaCard nodes
 */
export type NodeType = 'idea' | 'media';

export interface NodePosition {
    x: number;
    y: number;
}

/**
 * Input mode for IdeaCard (note = plain text, ai = AI prompt)
 * Re-exported from slashCommand.ts for convenience
 */
export type { InputMode } from './slashCommand';

/**
 * Metadata fetched from a URL for rich link preview cards
 * Parsed from Open Graph and Twitter Card meta tags
 */
export interface LinkPreviewMetadata {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    domain?: string;
    cardType?: 'summary' | 'summary_large_image' | 'player' | 'app';
    fetchedAt: number;
    error?: boolean;
}

/**
 * Data structure for IdeaCard nodes (unified prompt + output)
 */
export interface IdeaNodeData {
    heading?: string;
    /** @deprecated Legacy field — heading is SSOT for prompts. Kept for backward compatibility. */
    prompt?: string;
    output?: string;
    isGenerating?: boolean;
    isPromptCollapsed?: boolean;
    /** Prevents drag when true (Phase 5: NodeUX) */
    isPinned?: boolean;
    /** Shows only heading when true (Phase 5: NodeUX) */
    isCollapsed?: boolean;
    tags?: string[]; // Tag IDs for BASB organization
    linkPreviews?: Record<string, LinkPreviewMetadata>; // Keyed by URL
    [key: string]: unknown; // Index signature for ReactFlow compatibility
}

export interface CanvasNode {
    id: string;
    workspaceId: string;
    type: NodeType;
    data: IdeaNodeData;
    position: NodePosition;
    width?: number;
    height?: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create a unified IdeaCard node (prompt + output in one)
 * Returns node with default dimensions for consistent sizing
 */
export function createIdeaNode(
    id: string,
    workspaceId: string,
    position: NodePosition,
    prompt = ''
): CanvasNode {
    const now = new Date();
    return {
        id,
        workspaceId,
        type: 'idea',
        data: {
            heading: '',
            ...(prompt ? { prompt } : {}),
            output: undefined,
            isGenerating: false,
            isPromptCollapsed: false,
            isPinned: false,
            isCollapsed: false,
        },
        position,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        createdAt: now,
        updatedAt: now,
    };
}

