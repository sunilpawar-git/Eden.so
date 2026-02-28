/**
 * ToolbarSection Tests — Settings UI for dual-deck icon arrangement.
 * Layout shape: { deck1: ActionId[], deck2: ActionId[] }
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolbarSection } from '../sections/ToolbarSection';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { DEFAULT_UTILS_BAR_LAYOUT, ALL_ACTION_IDS } from '@/features/canvas/types/utilsBarLayout';
import { strings } from '@/shared/localization/strings';
import {
    createLocalStorageMock,
    createMockMatchMedia,
} from '@/shared/stores/__tests__/helpers/settingsTestSetup';

const localStorageMock = createLocalStorageMock();

describe('ToolbarSection', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        useSettingsStore.setState({ utilsBarLayout: DEFAULT_UTILS_BAR_LAYOUT });
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('renders the layout title', () => {
        render(<ToolbarSection />);
        expect(screen.getByText(strings.settings.toolbarLayout)).toBeInTheDocument();
    });

    it('renders both column headers', () => {
        render(<ToolbarSection />);
        expect(screen.getByText(strings.settings.toolbarBar1)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.toolbarBar2)).toBeInTheDocument();
    });

    it('renders all 12 action labels across both columns', () => {
        render(<ToolbarSection />);
        for (const id of ALL_ACTION_IDS) {
            const label = strings.nodeUtils[id as keyof typeof strings.nodeUtils];
            if (typeof label === 'string') {
                expect(screen.getByText(label)).toBeInTheDocument();
            }
        }
    });

    it('renders a reset button', () => {
        render(<ToolbarSection />);
        expect(screen.getByText(strings.settings.toolbarReset)).toBeInTheDocument();
    });

    it('clicking move arrow button moves action to other deck', () => {
        render(<ToolbarSection />);
        const moveButton = screen.getByLabelText(`${strings.settings.toolbarMoveToBar2}: ${strings.nodeUtils.connect}`);
        expect(moveButton).not.toBeDisabled();
        fireEvent.click(moveButton);
        expect(useSettingsStore.getState().utilsBarLayout.deck2).toContain('connect');
        expect(useSettingsStore.getState().utilsBarLayout.deck1).not.toContain('connect');
    });

    it('disables move buttons when deck would drop below MIN_ACTIONS_PER_DECK', () => {
        useSettingsStore.setState({
            utilsBarLayout: {
                deck1: ['pin', 'delete'],
                deck2: ['ai', 'connect', 'copy', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
            },
        });
        render(<ToolbarSection />);
        const pinMoveBtn = screen.getByLabelText(`${strings.settings.toolbarMoveToBar2}: ${strings.nodeUtils.pin}`);
        expect(pinMoveBtn).toBeDisabled();
    });

    it('reset button restores default layout', () => {
        useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
        expect(useSettingsStore.getState().utilsBarLayout.deck2).toContain('connect');

        render(<ToolbarSection />);
        fireEvent.click(screen.getByText(strings.settings.toolbarReset));
        expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
    });

    it('uses string resources for column headers and reset label', () => {
        render(<ToolbarSection />);
        expect(screen.getByText(strings.settings.toolbarBar1)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.toolbarBar2)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.toolbarReset)).toBeInTheDocument();
    });

    it('actions in default deck1 render in their stored order', () => {
        render(<ToolbarSection />);
        const listItems = screen.getAllByRole('listitem');
        const deck1Labels = DEFAULT_UTILS_BAR_LAYOUT.deck1.map(
            (id) => strings.nodeUtils[id as keyof typeof strings.nodeUtils],
        );
        // First N list items should match deck1 order
        deck1Labels.forEach((label, i) => {
            if (typeof label === 'string') {
                expect(listItems[i]?.textContent).toContain(label);
            }
        });
    });
});
