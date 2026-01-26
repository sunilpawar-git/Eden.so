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
    };
}
