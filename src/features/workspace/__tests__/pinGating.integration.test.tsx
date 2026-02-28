/**
 * Pin Gating Integration Tests
 * TDD: Verifies pin button behavior based on subscription tier
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PinWorkspaceButton } from '../components/PinWorkspaceButton';
import { strings } from '@/shared/localization/strings';

// Mock pinned workspace store
let mockPinnedIds: string[] = [];
const mockPinWorkspace = vi.fn().mockResolvedValue(true);
const mockUnpinWorkspace = vi.fn().mockResolvedValue(true);

const buildPinState = () => ({
    pinnedIds: mockPinnedIds,
    pinWorkspace: mockPinWorkspace,
    unpinWorkspace: mockUnpinWorkspace,
});

vi.mock('../stores/pinnedWorkspaceStore', () => {
    const selectorFn = (selector: (s: Record<string, unknown>) => unknown) =>
        selector(buildPinState());
    Object.assign(selectorFn, { getState: () => buildPinState() });
    return { usePinnedWorkspaceStore: selectorFn };
});

// Mock feature gate
let mockHasAccess = false;
vi.mock('@/features/subscription/hooks/useFeatureGate', () => ({
    useFeatureGate: () => ({
        hasAccess: mockHasAccess,
        isLoading: false,
        tier: mockHasAccess ? 'pro' : 'free',
    }),
}));

vi.mock('@/features/subscription/types/subscription', () => ({
    GATED_FEATURES: { offlinePin: 'offlinePin' },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

describe('PinWorkspaceButton - subscription gating', () => {
    it('shows upgrade prompt when free user tries to pin', () => {
        mockHasAccess = false;
        mockPinnedIds = [];
        render(<PinWorkspaceButton workspaceId="ws-1" />);

        fireEvent.click(screen.getByLabelText(strings.pinning.pin));

        // Upgrade prompt should appear
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(strings.subscription.upgradeTitle)).toBeInTheDocument();
    });

    it('pins workspace when pro user clicks pin', () => {
        mockHasAccess = true;
        mockPinnedIds = [];
        render(<PinWorkspaceButton workspaceId="ws-1" />);

        fireEvent.click(screen.getByLabelText(strings.pinning.pin));

        // Should call pin, not show upgrade
        expect(mockPinWorkspace).toHaveBeenCalledWith('ws-1');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('allows free user to unpin already-pinned workspace', () => {
        mockHasAccess = false;
        mockPinnedIds = ['ws-1'];
        render(<PinWorkspaceButton workspaceId="ws-1" />);

        fireEvent.click(screen.getByLabelText(strings.pinning.unpin));

        expect(mockUnpinWorkspace).toHaveBeenCalledWith('ws-1');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dismisses upgrade prompt when user clicks dismiss', () => {
        mockHasAccess = false;
        mockPinnedIds = [];
        render(<PinWorkspaceButton workspaceId="ws-1" />);

        fireEvent.click(screen.getByLabelText(strings.pinning.pin));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.click(screen.getByText(strings.subscription.dismissUpgrade));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
