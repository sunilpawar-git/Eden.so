/**
 * Settings Store - State management for app preferences
 * SSOT for theme, canvas settings, and user preferences
 */
import { create } from 'zustand';
import { getStorageItem, getValidatedStorageItem, setStorageItem, getStorageJson, setStorageJson } from '@/shared/utils/storage';
import { trackSettingsChanged } from '@/shared/services/analyticsService';
import {
    type ActionId,
    DEFAULT_UTILS_BAR,
    DEFAULT_CONTEXT_MENU,
    UTILS_BAR_MAX,
    CONTEXT_MENU_MAX,
    validatePlacement,
    validateActionList,
} from './iconRegistry';

export type ThemeOption = 'light' | 'dark' | 'system' | 'sepia' | 'grey' | 'darkBlack';
type ResolvedTheme = 'light' | 'dark' | 'sepia' | 'grey' | 'darkBlack';

/** Direct themes that resolve to themselves (not 'system') */
const DIRECT_THEMES: ReadonlySet<string> = new Set(['light', 'dark', 'sepia', 'grey', 'darkBlack']);

export type CanvasScrollMode = 'zoom' | 'navigate';
export type ConnectorStyle = 'solid' | 'subtle' | 'thick' | 'dashed' | 'dotted';
export type SettingsTabId = 'appearance' | 'canvas' | 'toolbar' | 'account' | 'keyboard' | 'about';

/** Allow-lists for validated storage reads (defense-in-depth) */
const VALID_THEMES: readonly ThemeOption[] = ['light', 'dark', 'system', 'sepia', 'grey', 'darkBlack'];
const VALID_SCROLL_MODES: readonly CanvasScrollMode[] = ['zoom', 'navigate'];
const VALID_CONNECTOR_STYLES: readonly ConnectorStyle[] = ['solid', 'subtle', 'thick', 'dashed', 'dotted'];
const VALID_SETTINGS_TABS: readonly SettingsTabId[] = ['appearance', 'canvas', 'toolbar', 'account', 'keyboard', 'about'];

// Storage keys
const STORAGE_KEYS = {
    theme: 'settings-theme',
    canvasGrid: 'settings-canvasGrid',
    autoSave: 'settings-autoSave',
    autoSaveInterval: 'settings-autoSaveInterval',
    compactMode: 'settings-compactMode',
    canvasScrollMode: 'settings-canvasScrollMode',
    connectorStyle: 'settings-connectorStyle',
    isCanvasLocked: 'settings-isCanvasLocked',
    canvasFreeFlow: 'settings-canvasFreeFlow',
    autoAnalyzeDocuments: 'settings-autoAnalyzeDocuments',
    lastSettingsTab: 'settings-lastSettingsTab',
    utilsBarIcons: 'settings-utilsBarIcons',
    contextMenuIcons: 'settings-contextMenuIcons',
} as const;

// Constants
const AUTO_SAVE_MIN = 10;
const AUTO_SAVE_MAX = 300;
const AUTO_SAVE_DEFAULT = 30;

interface SettingsState {
    theme: ThemeOption;
    canvasGrid: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
    compactMode: boolean;
    canvasScrollMode: CanvasScrollMode;
    connectorStyle: ConnectorStyle;
    isCanvasLocked: boolean;
    canvasFreeFlow: boolean;
    autoAnalyzeDocuments: boolean;
    lastSettingsTab: SettingsTabId;
    utilsBarIcons: ActionId[];
    contextMenuIcons: ActionId[];
    setTheme: (theme: ThemeOption) => void;
    toggleCanvasGrid: () => void;
    setAutoSave: (enabled: boolean) => void;
    setAutoSaveInterval: (seconds: number) => void;
    toggleCompactMode: () => void;
    setCanvasScrollMode: (mode: CanvasScrollMode) => void;
    setConnectorStyle: (style: ConnectorStyle) => void;
    toggleCanvasLocked: () => void;
    toggleCanvasFreeFlow: () => void;
    toggleAutoAnalyzeDocuments: () => void;
    setLastSettingsTab: (tab: SettingsTabId) => void;
    setUtilsBarIcons: (icons: ActionId[]) => void;
    setContextMenuIcons: (icons: ActionId[]) => void;
    resetIconPlacement: () => void;
    getResolvedTheme: () => ResolvedTheme;
    loadFromStorage: () => void;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function getClampedStorageItem(key: string, defaultVal: number, min: number, max: number): number {
    return clamp(getStorageItem<number>(key, defaultVal), min, max);
}

/** Build initial state values from localStorage (pure helper, no actions). */
function createInitialState() {
    const placement = validatePlacement(
        getStorageJson<unknown>(STORAGE_KEYS.utilsBarIcons, null),
        getStorageJson<unknown>(STORAGE_KEYS.contextMenuIcons, null),
    );
    return {
        theme: getValidatedStorageItem(STORAGE_KEYS.theme, 'system', VALID_THEMES),
        canvasGrid: getStorageItem<boolean>(STORAGE_KEYS.canvasGrid, true),
        autoSave: getStorageItem<boolean>(STORAGE_KEYS.autoSave, true),
        autoSaveInterval: getClampedStorageItem(STORAGE_KEYS.autoSaveInterval, AUTO_SAVE_DEFAULT, AUTO_SAVE_MIN, AUTO_SAVE_MAX),
        compactMode: getStorageItem<boolean>(STORAGE_KEYS.compactMode, false),
        canvasScrollMode: getValidatedStorageItem(STORAGE_KEYS.canvasScrollMode, 'zoom', VALID_SCROLL_MODES),
        connectorStyle: getValidatedStorageItem(STORAGE_KEYS.connectorStyle, 'solid', VALID_CONNECTOR_STYLES),
        isCanvasLocked: getStorageItem<boolean>(STORAGE_KEYS.isCanvasLocked, false),
        canvasFreeFlow: getStorageItem<boolean>(STORAGE_KEYS.canvasFreeFlow, false),
        autoAnalyzeDocuments: getStorageItem<boolean>(STORAGE_KEYS.autoAnalyzeDocuments, true),
        lastSettingsTab: getValidatedStorageItem(STORAGE_KEYS.lastSettingsTab, 'appearance', VALID_SETTINGS_TABS),
        utilsBarIcons: placement.utilsBar,
        contextMenuIcons: placement.contextMenu,
    };
}

/** Build all action methods for the settings store. */
function createSettingsActions(
    set: (partial: Partial<SettingsState>) => void,
    get: () => SettingsState,
): Omit<SettingsState, keyof ReturnType<typeof createInitialState>> {
    const toggle = (key: 'canvasGrid' | 'compactMode' | 'isCanvasLocked' | 'canvasFreeFlow' | 'autoAnalyzeDocuments') => {
        const v = !get()[key]; set({ [key]: v }); setStorageItem(STORAGE_KEYS[key], v); trackSettingsChanged(key, v);
    };
    return {
        setTheme: (theme) => { set({ theme }); setStorageItem(STORAGE_KEYS.theme, theme); trackSettingsChanged('theme', theme); },
        toggleCanvasGrid: () => toggle('canvasGrid'),
        setAutoSave: (enabled) => { set({ autoSave: enabled }); setStorageItem(STORAGE_KEYS.autoSave, enabled); trackSettingsChanged('autoSave', enabled); },
        setAutoSaveInterval: (seconds) => {
            const clamped = clamp(seconds, AUTO_SAVE_MIN, AUTO_SAVE_MAX);
            set({ autoSaveInterval: clamped }); setStorageItem(STORAGE_KEYS.autoSaveInterval, clamped); trackSettingsChanged('autoSaveInterval', clamped);
        },
        toggleCompactMode: () => toggle('compactMode'),
        setCanvasScrollMode: (mode) => { set({ canvasScrollMode: mode }); setStorageItem(STORAGE_KEYS.canvasScrollMode, mode); trackSettingsChanged('canvasScrollMode', mode); },
        setConnectorStyle: (style) => { set({ connectorStyle: style }); setStorageItem(STORAGE_KEYS.connectorStyle, style); trackSettingsChanged('connectorStyle', style); },
        toggleCanvasLocked: () => toggle('isCanvasLocked'),
        toggleCanvasFreeFlow: () => toggle('canvasFreeFlow'),
        toggleAutoAnalyzeDocuments: () => toggle('autoAnalyzeDocuments'),
        setUtilsBarIcons: (icons) => {
            const validated = validateActionList(icons, UTILS_BAR_MAX);
            set({ utilsBarIcons: validated }); setStorageJson(STORAGE_KEYS.utilsBarIcons, validated); trackSettingsChanged('utilsBarIcons', validated);
        },
        setContextMenuIcons: (icons) => {
            const validated = validateActionList(icons, CONTEXT_MENU_MAX);
            set({ contextMenuIcons: validated }); setStorageJson(STORAGE_KEYS.contextMenuIcons, validated); trackSettingsChanged('contextMenuIcons', validated);
        },
        resetIconPlacement: () => {
            const utilsBar = [...DEFAULT_UTILS_BAR]; const contextMenu = [...DEFAULT_CONTEXT_MENU];
            set({ utilsBarIcons: utilsBar, contextMenuIcons: contextMenu });
            setStorageJson(STORAGE_KEYS.utilsBarIcons, utilsBar); setStorageJson(STORAGE_KEYS.contextMenuIcons, contextMenu);
            trackSettingsChanged('iconPlacementReset', true);
        },
        setLastSettingsTab: (tab) => { set({ lastSettingsTab: tab }); setStorageItem(STORAGE_KEYS.lastSettingsTab, tab); },
        getResolvedTheme: () => {
            const { theme } = get();
            if (DIRECT_THEMES.has(theme)) return theme as ResolvedTheme;
            if (typeof window !== 'undefined') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            return 'light';
        },
        loadFromStorage: () => { set(createInitialState()); },
    };
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
    ...createInitialState(),
    ...createSettingsActions(set, get),
}));
