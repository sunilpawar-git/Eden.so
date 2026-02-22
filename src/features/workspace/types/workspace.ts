/**
 * Workspace Model - Strict type definition
 */
export type CanvasBackground = 'white' | 'light' | 'dark' | 'grid';

export interface CanvasSettings {
    backgroundColor: CanvasBackground;
}

export type WorkspaceType = 'workspace' | 'divider';

export interface Workspace {
    id: string;
    userId: string;
    name: string;
    canvasSettings: CanvasSettings;
    createdAt: Date;
    updatedAt: Date;
    orderIndex?: number;
    type?: WorkspaceType; // Undefined means 'workspace'
    nodeCount?: number;
}

/**
 * Create a new workspace with defaults
 */
export function createWorkspace(
    id: string,
    userId: string,
    name: string
): Workspace {
    const now = new Date();
    return {
        id,
        userId,
        name,
        canvasSettings: {
            backgroundColor: 'grid',
        },
        createdAt: now,
        updatedAt: now,
        orderIndex: Date.now(),
        type: 'workspace',
    };
}

/**
 * Create a divider item instead of a full workspace
 */
export function createDivider(id: string, userId: string): Workspace {
    const now = new Date();
    return {
        id,
        userId,
        name: '---', // Keep a fallback name for backwards compatibility
        canvasSettings: { backgroundColor: 'white' },
        createdAt: now,
        updatedAt: now,
        orderIndex: Date.now(),
        type: 'divider',
    };
}
