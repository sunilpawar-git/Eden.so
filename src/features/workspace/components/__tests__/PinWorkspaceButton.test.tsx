/**
 * PinWorkspaceButton Component Tests
 * TDD: Verifies pin/unpin UI behavior and string resource usage
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PinWorkspaceButton } from '../PinWorkspaceButton';
import { strings } from '@/shared/localization/strings';

// Mock the pinned workspace store
const mockIsPinned = vi.fn().mockReturnValue(false);
const mockPinWorkspace = vi.fn().mockResolvedValue(true);
const mockUnpinWorkspace = vi.fn().mockResolvedValue(true);

const buildPinState = () => ({
    isPinned: mockIsPinned,
    pinWorkspace: mockPinWorkspace,
    unpinWorkspace: mockUnpinWorkspace,
    pinnedIds: [],
});

vi.mock('../../stores/pinnedWorkspaceStore', () => {
    const selectorFn = (selector: (s: Record<string, unknown>) => unknown) =>
        selector(buildPinState());
    Object.assign(selectorFn, { getState: () => buildPinState() });
    return { usePinnedWorkspaceStore: selectorFn };
});

// Mock feature gate as pro user (has access)
vi.mock('@/features/subscription/hooks/useFeatureGate', () => ({
    useFeatureGate: () => ({ hasAccess: true, isLoading: false, tier: 'pro' }),
}));

vi.mock('@/features/subscription/types/subscription', () => ({
    GATED_FEATURES: { offlinePin: 'offlinePin' },
}));

vi.mock('@/shared/services/storageQuotaService', () => ({
    storageQuotaService: {
        getQuotaInfo: vi.fn().mockResolvedValue({
            usageBytes: 1048576,
            quotaBytes: 1073741824,
            percentUsed: 0.1,
            isAvailable: true,
        }),
        formatBytes: vi.fn().mockReturnValue('1.0 MB'),
        isStorageManagerAvailable: vi.fn().mockReturnValue(true),
    },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

describe('PinWorkspaceButton', () => {
    it('renders with pin label when not pinned', () => {
        mockIsPinned.mockReturnValue(false);
        render(<PinWorkspaceButton workspaceId="ws-1" />);
        expect(screen.getByLabelText(strings.pinning.pin)).toBeInTheDocument();
    });

    it('renders with unpin label when pinned', async () => {
        mockIsPinned.mockReturnValue(true);
        render(<PinWorkspaceButton workspaceId="ws-1" />);
        await waitFor(() => {
            expect(screen.getByLabelText(strings.pinning.unpin)).toBeInTheDocument();
        });
    });

    it('calls pinWorkspace on click when not pinned', () => {
        mockIsPinned.mockReturnValue(false);
        render(<PinWorkspaceButton workspaceId="ws-1" />);
        fireEvent.click(screen.getByLabelText(strings.pinning.pin));
        expect(mockPinWorkspace).toHaveBeenCalledWith('ws-1');
    });

    it('calls unpinWorkspace on click when pinned', async () => {
        mockIsPinned.mockReturnValue(true);
        render(<PinWorkspaceButton workspaceId="ws-1" />);
        await waitFor(() => {
            expect(screen.getByLabelText(strings.pinning.unpin)).toBeInTheDocument();
        });
        fireEvent.click(screen.getByLabelText(strings.pinning.unpin));
        expect(mockUnpinWorkspace).toHaveBeenCalledWith('ws-1');
    });

    it('uses string resources for tooltip', () => {
        mockIsPinned.mockReturnValue(false);
        render(<PinWorkspaceButton workspaceId="ws-1" />);
        expect(screen.getByTitle(strings.pinning.pinTooltip)).toBeInTheDocument();
    });

    it('shows storage usage in tooltip when pinned', async () => {
        mockIsPinned.mockReturnValue(true);
        render(<PinWorkspaceButton workspaceId="ws-1" />);

        // Wait for async storage quota fetch
        await waitFor(() => {
            const button = screen.getByLabelText(strings.pinning.unpin);
            expect(button.getAttribute('title')).toContain(strings.pinning.storageUsage);
        });
    });
});
