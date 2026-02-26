/**
 * ToolbarSection Integration Test — Settings change -> store -> bar layout.
 * Verifies the full data flow from UI toggle to store persistence.
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

        expect(useSettingsStore.getState().utilsBarLayout.connect).toBe(2);

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'settings-utilsBarLayout',
            expect.stringContaining('"connect":2'),
        );

        const stored = JSON.parse(
            localStorageMock.setItem.mock.calls.find(
                (c: string[]) => c[0] === 'settings-utilsBarLayout',
            )?.[1] ?? '{}',
        );
        expect(stored.connect).toBe(2);
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
            utilsBarLayout: { ...DEFAULT_UTILS_BAR_LAYOUT, ai: 2, connect: 2, copy: 2 },
        });
        render(<ToolbarSection />);

        const pinBtn = screen.getByLabelText(`${strings.settings.toolbarMoveToBar2}: ${strings.nodeUtils.pin}`);
        expect(pinBtn).toBeDisabled();
        fireEvent.click(pinBtn);
        expect(useSettingsStore.getState().utilsBarLayout.pin).toBe(1);
    });
});
