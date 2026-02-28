/**
 * ToolbarSection Drag Tests — Drag-and-drop reordering within and across decks.
 * Uses HTML5 DragEvent simulation via fireEvent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolbarSection } from '../sections/ToolbarSection';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { DEFAULT_UTILS_BAR_LAYOUT } from '@/features/canvas/types/utilsBarLayout';
import {
    createLocalStorageMock,
    createMockMatchMedia,
} from '@/shared/stores/__tests__/helpers/settingsTestSetup';

const localStorageMock = createLocalStorageMock();

function resetLayout() {
    useSettingsStore.setState({ utilsBarLayout: DEFAULT_UTILS_BAR_LAYOUT });
}

/** Gets all <li> drag items by column (deck1 = first column, deck2 = second) */
function getDeckItems() {
    const lists = screen.getAllByRole('list');
    const deck1Items = Array.from(lists[0]?.querySelectorAll('li') ?? []);
    const deck2Items = Array.from(lists[1]?.querySelectorAll('li') ?? []);
    return { deck1Items, deck2Items };
}

describe('ToolbarSection — drag-and-drop reordering', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        resetLayout();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('each action row is draggable', () => {
        render(<ToolbarSection />);
        const { deck1Items } = getDeckItems();
        deck1Items.forEach((item) => {
            expect(item).toHaveAttribute('draggable', 'true');
        });
    });

    it('renders drag handles for all action rows', () => {
        render(<ToolbarSection />);
        const handles = screen.getAllByTestId('drag-handle');
        expect(handles).toHaveLength(12); // one per action
    });

    it('dragging first deck1 item to second position reorders within deck1', () => {
        render(<ToolbarSection />);
        const { deck1Items } = getDeckItems();
        const source = deck1Items[0]!;
        const target = deck1Items[1]!;

        fireEvent.dragStart(source);
        fireEvent.dragOver(target);
        fireEvent.drop(target);
        fireEvent.dragEnd(source);

        const { deck1 } = useSettingsStore.getState().utilsBarLayout;
        // Original: ['ai', 'connect', 'copy', 'pin', 'delete']
        // ai dragged to index 1 → ['connect', 'ai', 'copy', 'pin', 'delete']
        expect(deck1[1]).toBe('ai');
        expect(deck1[0]).toBe('connect');
    });

    it('dragging last deck1 item to first position works', () => {
        render(<ToolbarSection />);
        const { deck1Items } = getDeckItems();
        const source = deck1Items[deck1Items.length - 1]!;
        const target = deck1Items[0]!;

        fireEvent.dragStart(source);
        fireEvent.dragOver(target);
        fireEvent.drop(target);
        fireEvent.dragEnd(source);

        const { deck1 } = useSettingsStore.getState().utilsBarLayout;
        expect(deck1[0]).toBe('delete');
    });

    it('dragging an item onto itself is a no-op', () => {
        const before = useSettingsStore.getState().utilsBarLayout;
        render(<ToolbarSection />);
        const { deck1Items } = getDeckItems();
        const item = deck1Items[0]!;

        fireEvent.dragStart(item);
        fireEvent.dragOver(item);
        fireEvent.drop(item);
        fireEvent.dragEnd(item);

        expect(useSettingsStore.getState().utilsBarLayout).toBe(before);
    });

    it('dragEnd without drop clears drag state without mutating store', () => {
        const before = useSettingsStore.getState().utilsBarLayout;
        render(<ToolbarSection />);
        const { deck1Items } = getDeckItems();

        fireEvent.dragStart(deck1Items[0]!);
        fireEvent.dragEnd(deck1Items[0]!);

        expect(useSettingsStore.getState().utilsBarLayout).toBe(before);
    });

    it('dragging from deck1 to deck2 moves action cross-deck', () => {
        render(<ToolbarSection />);
        const { deck1Items, deck2Items } = getDeckItems();
        // Drag 'ai' (first of deck1) to first position in deck2
        fireEvent.dragStart(deck1Items[0]!);
        fireEvent.dragOver(deck2Items[0]!);
        fireEvent.drop(deck2Items[0]!);
        fireEvent.dragEnd(deck1Items[0]!);

        const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
        expect(deck1).not.toContain('ai');
        expect(deck2).toContain('ai');
    });

    it('preserves total action count after drag', () => {
        render(<ToolbarSection />);
        const { deck1Items } = getDeckItems();

        fireEvent.dragStart(deck1Items[0]!);
        fireEvent.dragOver(deck1Items[2]!);
        fireEvent.drop(deck1Items[2]!);

        const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
        expect(deck1.length + deck2.length).toBe(12);
    });
});
