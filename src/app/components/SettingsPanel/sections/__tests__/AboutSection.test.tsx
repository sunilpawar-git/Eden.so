/**
 * AboutSection Tests — Version display and external links
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutSection } from '../AboutSection';
import { strings } from '@/shared/localization/strings';

vi.stubGlobal('__APP_VERSION__', '1.2.3');

describe('AboutSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays the version string', () => {
        render(<AboutSection />);
        expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument();
    });

    it('displays the version label', () => {
        render(<AboutSection />);
        expect(screen.getByText(strings.settings.version)).toBeInTheDocument();
    });

    it('renders report-a-bug link with secure attributes', () => {
        render(<AboutSection />);
        const link = screen.getByText(strings.settings.reportBug);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders changelog link with secure attributes', () => {
        render(<AboutSection />);
        const link = screen.getByText(strings.settings.changelog);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
