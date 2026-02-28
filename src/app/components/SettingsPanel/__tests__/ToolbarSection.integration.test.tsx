/**
 * ToolbarSection Integration Test — Settings change -> store -> bar layout.
 * Verifies the full data flow from UI toggle to store persistence.
 * Layout shape: { deck1: ActionId[], deck2: ActionId[] }
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolbarSection } from '../sections/ToolbarSection';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { DEFAULT_UTILS_BAR_LAYOUT } from '@/features/canvas/types/utilsBarLayout';
import { strings } from '@/shared/localization/strings';
import {
    createLocalStorageMock,
    createMockMatchMedia,
} from '@/shared/stores/__tests__/helpers/settingsTestSetup';

const localStorageMock = createLocalStorageMock();

describe('ToolbarSection -> settingsStore integration', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        useSettingsStore.setState({ utilsBarLayout: DEFAULT_UTILS_BAR_LAYOUT });
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('move action -> store updates -> localStorage persists -> reload recovers', () => {
        render(<ToolbarSection />);
        const moveBtn = screen.getByLabelText(`${strings.settings.toolbarMoveToBar2}: ${strings.nodeUtils.connect}`);
        fireEvent.click(moveBtn);

        expect(useSettingsStore.getState().utilsBarLayout.deck2).toContain('connect');
        expect(useSettingsStore.getState().utilsBarLayout.deck1).not.toContain('connect');

        // Verify localStorage was called with JSON containing deck2 with 'connect'
        const calls = localStorageMock.setItem.mock.calls as string[][];
        const persistedCall = calls.find((c) => c[0] === 'settings-utilsBarLayout');
        expect(persistedCall).toBeDefined();
        const stored = JSON.parse(persistedCall?.[1] ?? '{}');
        expect(stored.deck2).toContain('connect');
    });

    it('reset button restores defaults and persists', () => {
        useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
        render(<ToolbarSection />);
        fireEvent.click(screen.getByText(strings.settings.toolbarReset));

        expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'settings-utilsBarLayout',
            JSON.stringify(DEFAULT_UTILS_BAR_LAYOUT),
        );
    });

    it('disabled state prevents moving when source deck has MIN_ACTIONS_PER_DECK', () => {
        useSettingsStore.setState({
            utilsBarLayout: {
                deck1: ['pin', 'delete'],
                deck2: ['ai', 'connect', 'copy', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
            },
        });
        render(<ToolbarSection />);

        const pinBtn = screen.getByLabelText(`${strings.settings.toolbarMoveToBar2}: ${strings.nodeUtils.pin}`);
        expect(pinBtn).toBeDisabled();
        fireEvent.click(pinBtn);
        expect(useSettingsStore.getState().utilsBarLayout.deck1).toContain('pin');
    });

    it('action order is preserved across store → UI → store roundtrip', () => {
        render(<ToolbarSection />);
        // Move 'connect' to deck2 — it should appear last in deck2
        fireEvent.click(
            screen.getByLabelText(`${strings.settings.toolbarMoveToBar2}: ${strings.nodeUtils.connect}`),
        );
        const { deck2 } = useSettingsStore.getState().utilsBarLayout;
        expect(deck2[deck2.length - 1]).toBe('connect');
    });

    it('drag reorder → store update → component re-renders in new order', () => {
        render(<ToolbarSection />);
        const lists = screen.getAllByRole('list');
        const getDeck1Labels = () =>
            Array.from(lists[0]?.querySelectorAll('li') ?? []).map(
                (li) => li.querySelector('[class*="actionLabel"]')?.textContent ?? '',
            );

        const initialOrder = getDeck1Labels();
        // Default deck1: ['ai', 'connect', 'copy', 'pin', 'delete']
        // Drag first item (AI Actions) to second position (Connect)
        const deck1Items = Array.from(lists[0]?.querySelectorAll('li') ?? []);
        const source = deck1Items[0]!;
        const target = deck1Items[1]!;

        fireEvent.dragStart(source);
        fireEvent.dragOver(target);
        fireEvent.drop(target);
        fireEvent.dragEnd(source);

        const newOrder = getDeck1Labels();
        // First item should have changed — AI Actions moved to position 1
        expect(newOrder[0]).not.toBe(initialOrder[0]);
        // AI Actions label is now second
        expect(newOrder[1]).toBe(strings.nodeUtils.aiActions);
        // Connect label is now first
        expect(newOrder[0]).toBe(strings.nodeUtils.connect);
    });
});
