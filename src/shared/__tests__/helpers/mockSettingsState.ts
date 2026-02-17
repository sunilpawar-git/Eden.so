/**
 * Shared mock factory for useSettingsStore in component tests
 * SSOT: single place to update when SettingsState interface changes
 */
import { vi } from 'vitest';

/** Creates a complete mock SettingsState with optional overrides */
export function createMockSettingsState(overrides: Record<string, unknown> = {}) {
    return {
        theme: 'system' as const,
        canvasGrid: true,
        autoSave: true,
        autoSaveInterval: 30,
        compactMode: false,
        canvasScrollMode: 'zoom' as const,
        isCanvasLocked: false,
        setTheme: vi.fn(),
        toggleCanvasGrid: vi.fn(),
        setAutoSave: vi.fn(),
        setAutoSaveInterval: vi.fn(),
        toggleCompactMode: vi.fn(),
        setCanvasScrollMode: vi.fn(),
        toggleCanvasLocked: vi.fn(),
        getResolvedTheme: () => 'light' as const,
        loadFromStorage: vi.fn(),
        ...overrides,
    };
}
