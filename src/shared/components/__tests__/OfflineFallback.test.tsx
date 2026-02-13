/**
 * OfflineFallback Component Tests
 * TDD: Verifies offline fallback page renders correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineFallback } from '../OfflineFallback';
import { strings } from '@/shared/localization/strings';

// Mock swCacheService
const mockGetFromCache = vi.fn().mockResolvedValue(null);
vi.mock('@/shared/services/swCacheService', () => ({
    swCacheService: {
        isCacheAvailable: () => true,
        getFromCache: (...args: unknown[]) => mockGetFromCache(...args),
        putInCache: vi.fn(),
        deleteFromCache: vi.fn(),
        clearCache: vi.fn(),
    },
}));

describe('OfflineFallback', () => {
    beforeEach(() => {
        mockGetFromCache.mockResolvedValue(null);
    });
    it('renders offline title when hasOfflineData is true', () => {
        render(<OfflineFallback hasOfflineData={true} onRetry={vi.fn()} />);
        expect(screen.getByText(strings.offlineFallback.title)).toBeInTheDocument();
    });

    it('renders no-data title when hasOfflineData is false', () => {
        render(<OfflineFallback hasOfflineData={false} onRetry={vi.fn()} />);
        expect(screen.getByText(strings.offlineFallback.noDataTitle)).toBeInTheDocument();
    });

    it('renders no-data message when hasOfflineData is false', () => {
        render(<OfflineFallback hasOfflineData={false} onRetry={vi.fn()} />);
        expect(screen.getByText(strings.offlineFallback.noDataMessage)).toBeInTheDocument();
    });

    it('renders offline message when hasOfflineData is true', () => {
        render(<OfflineFallback hasOfflineData={true} onRetry={vi.fn()} />);
        expect(screen.getByText(strings.offlineFallback.message)).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
        const onRetry = vi.fn();
        render(<OfflineFallback hasOfflineData={false} onRetry={onRetry} />);

        fireEvent.click(screen.getByText(strings.offlineFallback.retryButton));
        expect(onRetry).toHaveBeenCalledOnce();
    });

    it('has role="alert" for accessibility', () => {
        render(<OfflineFallback hasOfflineData={false} onRetry={vi.fn()} />);
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('uses string resources for all visible text (no data)', () => {
        render(<OfflineFallback hasOfflineData={false} onRetry={vi.fn()} />);
        expect(screen.getByText(strings.offlineFallback.noDataTitle)).toBeInTheDocument();
        expect(screen.getByText(strings.offlineFallback.noDataMessage)).toBeInTheDocument();
        expect(screen.getByText(strings.offlineFallback.retryButton)).toBeInTheDocument();
    });

    it('uses string resources for all visible text (with data)', () => {
        render(<OfflineFallback hasOfflineData={true} onRetry={vi.fn()} />);
        expect(screen.getByText(strings.offlineFallback.title)).toBeInTheDocument();
        expect(screen.getByText(strings.offlineFallback.message)).toBeInTheDocument();
        expect(screen.getByText(strings.offlineFallback.retryButton)).toBeInTheDocument();
    });

    it('shows "with data" title when SW cache has Firestore data', async () => {
        mockGetFromCache.mockResolvedValue(new Response('cached'));
        render(<OfflineFallback hasOfflineData={false} onRetry={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText(strings.offlineFallback.title)).toBeInTheDocument();
        });
    });

    it('probes the firestore-api cache on mount', () => {
        render(<OfflineFallback hasOfflineData={false} onRetry={vi.fn()} />);
        expect(mockGetFromCache).toHaveBeenCalledWith(
            'https://firestore.googleapis.com',
            'firestore-api'
        );
    });
});
