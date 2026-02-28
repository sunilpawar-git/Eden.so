/**
 * Shared mock factory for useSettingsStore in component tests
 * SSOT: single place to update when SettingsState interface changes
 */
import { vi } from 'vitest';
import { DEFAULT_UTILS_BAR_LAYOUT } from '@/features/canvas/types/utilsBarLayout';

function buildBaseMockSettingsState() {
    return {
        theme: 'system' as const,
        canvasGrid: true,
        autoSave: true,
        autoSaveInterval: 30,
        compactMode: false,
        canvasScrollMode: 'zoom' as const,
        connectorStyle: 'solid' as const,
        isCanvasLocked: false,
        canvasFreeFlow: false,
        lastSettingsTab: 'appearance' as const,
        utilsBarLayout: DEFAULT_UTILS_BAR_LAYOUT,
        setTheme: vi.fn(),
        toggleCanvasGrid: vi.fn(),
        setAutoSave: vi.fn(),
        setAutoSaveInterval: vi.fn(),
        toggleCompactMode: vi.fn(),
        setCanvasScrollMode: vi.fn(),
        setConnectorStyle: vi.fn(),
        toggleCanvasLocked: vi.fn(),
        toggleCanvasFreeFlow: vi.fn(),
        setUtilsBarActionDeck: vi.fn(),
        resetUtilsBarLayout: vi.fn(),
        setLastSettingsTab: vi.fn(),
        getResolvedTheme: () => 'light' as const,
        loadFromStorage: vi.fn(),
    };
}

/** Strongly-typed overrides for createMockSettingsState — only valid SettingsState keys allowed */
export type MockSettingsOverrides = Partial<ReturnType<typeof buildBaseMockSettingsState>>;

/** Creates a complete mock SettingsState with optional type-safe overrides */
export function createMockSettingsState(overrides: MockSettingsOverrides = {}) {
    return {
        ...buildBaseMockSettingsState(),
        ...overrides,
    };
}
