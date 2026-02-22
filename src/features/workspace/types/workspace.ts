/**
 * Workspace Model - Strict type definition
 */
export type CanvasBackground = 'white' | 'light' | 'dark' | 'grid';

export interface CanvasSettings {
    backgroundColor: CanvasBackground;
}

export interface Workspace {
    id: string;
    userId: string;
    name: string;
    canvasSettings: CanvasSettings;
    createdAt: Date;
    updatedAt: Date;
    orderIndex?: number;
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
        orderIndex: Date.now(), // default to placing new workspaces at the end (or top, based on sort) Let's default to Date.now()
    };
}
