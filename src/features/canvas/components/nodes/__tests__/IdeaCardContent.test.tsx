/**
 * Tests for IdeaCardContent sub-components
 * Only GeneratingContent remains — TipTapEditor is now rendered
 * at a stable tree position in IdeaCardContentSection.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeneratingContent } from '../IdeaCardContent';

describe('IdeaCardContent sub-components', () => {
    describe('GeneratingContent', () => {
        it('should render generating indicator', () => {
            render(<GeneratingContent />);
            expect(screen.getByText(/generating/i)).toBeInTheDocument();
        });
    });
});
