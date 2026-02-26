/**
 * OfflineBanner Component Tests
 * TDD: RED phase - tests written before implementation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineBanner } from '@/app/components/OfflineBanner';
import { strings } from '@/shared/localization/strings';

// Mock network status store
let mockIsOnline = true;
vi.mock('@/shared/stores/networkStatusStore', () => ({
    useNetworkStatusStore: (selector: (state: { isOnline: boolean }) => unknown) =>
        selector({ isOnline: mockIsOnline }),
}));

// Mock offline queue store
let mockPendingCount = 0;
vi.mock('@/features/workspace/stores/offlineQueueStore', () => ({
    useOfflineQueueStore: (selector: (state: { pendingCount: number }) => unknown) =>
        selector({ pendingCount: mockPendingCount }),
}));

describe('OfflineBanner', () => {
    beforeEach(() => {
        mockIsOnline = true;
        mockPendingCount = 0;
    });

    it('is hidden when online', () => {
        mockIsOnline = true;
        const { container } = render(<OfflineBanner />);
        // Should render nothing or a hidden element
        expect(container.querySelector('[class*="banner"]')).toBeNull();
    });

    it('is shown when offline', () => {
        mockIsOnline = false;
        render(<OfflineBanner />);
        expect(screen.getByText(strings.offline.offlineBanner)).toBeInTheDocument();
    });

    it('displays queue count when offline with pending changes', () => {
        mockIsOnline = false;
        mockPendingCount = 5;
        render(<OfflineBanner />);
        expect(screen.getByText(/5/)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(strings.offline.pendingSync))).toBeInTheDocument();
    });

    it('dismiss button hides the banner', () => {
        mockIsOnline = false;
        render(<OfflineBanner />);

        const dismissButton = screen.getByText(strings.offline.dismiss);
        fireEvent.click(dismissButton);

        expect(screen.queryByText(strings.offline.offlineBanner)).not.toBeInTheDocument();
    });

    it('reappears after dismissal when going online then offline again', () => {
        mockIsOnline = false;
        const { rerender } = render(<OfflineBanner />);

        // Dismiss the banner
        const dismissButton = screen.getByText(strings.offline.dismiss);
        fireEvent.click(dismissButton);
        expect(screen.queryByText(strings.offline.offlineBanner)).not.toBeInTheDocument();

        // Go online
        mockIsOnline = true;
        rerender(<OfflineBanner />);

        // Go offline again — banner should reappear
        mockIsOnline = false;
        rerender(<OfflineBanner />);
        expect(screen.getByText(strings.offline.offlineBanner)).toBeInTheDocument();
    });
});
