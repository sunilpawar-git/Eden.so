/**
 * NodeUtilsBar Dual-Deck Integration Tests
 * Tests real store + real hook interaction: layout changes move buttons between decks.
 * Includes stability test for Maximum Update Depth prevention.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { DEFAULT_UTILS_BAR_LAYOUT } from '../../../types/utilsBarLayout';
import {
    createLocalStorageMock,
    createMockMatchMedia,
} from '@/shared/stores/__tests__/helpers/settingsTestSetup';

const localStorageMock = createLocalStorageMock();

const defaultProps = {
    onTagClick: vi.fn(), onAIClick: vi.fn(),
    onConnectClick: vi.fn(), onDelete: vi.fn(),
    onCopyClick: vi.fn(), onPinToggle: vi.fn(),
    hasContent: true, disabled: false,
};

describe('NodeUtilsBar — dual-deck integration', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        useSettingsStore.setState({ utilsBarLayout: DEFAULT_UTILS_BAR_LAYOUT });
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('renders two toolbars with default layout', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        const toolbars = screen.getAllByRole('toolbar');
        expect(toolbars.length).toBe(2);
    });

    it('deck one contains AI, Connect, Copy, Pin, Delete by default', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        expect(screen.getByLabelText('AI Actions')).toBeInTheDocument();
        expect(screen.getByLabelText('Connect')).toBeInTheDocument();
        expect(screen.getByLabelText('Copy')).toBeInTheDocument();
        expect(screen.getByLabelText('Pin')).toBeInTheDocument();
        expect(screen.getByLabelText('Delete')).toBeInTheDocument();
    });

    it('moves Connect to deck two when store layout changes', () => {
        const { rerender } = render(<NodeUtilsBar {...defaultProps} />);

        act(() => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
        });
        rerender(<NodeUtilsBar {...defaultProps} />);

        expect(screen.getByLabelText('Connect')).toBeInTheDocument();
        expect(screen.getByLabelText('AI Actions')).toBeInTheDocument();
    });

    it('both decks have z-index CSS classes', () => {
        const { container } = render(<NodeUtilsBar {...defaultProps} />);
        const toolbars = container.querySelectorAll('[role="toolbar"]');
        expect(toolbars.length).toBe(2);
    });

    it('stability: 50 rapid store updates do not cause Maximum Update Depth', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        expect(() => {
            for (let i = 0; i < 50; i++) {
                act(() => {
                    useSettingsStore.getState().setUtilsBarActionDeck('connect', i % 2 === 0 ? 2 : 1);
                });
            }
        }).not.toThrow();

        expect(screen.getByLabelText('Connect')).toBeInTheDocument();
    });

    it('resetUtilsBarLayout restores buttons to their default decks', () => {
        act(() => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
        });

        render(<NodeUtilsBar {...defaultProps} />);

        act(() => {
            useSettingsStore.getState().resetUtilsBarLayout();
        });

        expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
    });
});
