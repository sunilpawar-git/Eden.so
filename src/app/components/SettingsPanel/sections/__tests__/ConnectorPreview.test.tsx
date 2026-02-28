/**
 * ConnectorPreview Tests — SVG line preview for connector styles
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConnectorPreview } from '../ConnectorPreview';
import type { ConnectorStyle } from '@/shared/stores/settingsStore';

const STYLES: ConnectorStyle[] = ['solid', 'subtle', 'thick', 'dashed', 'dotted'];

describe('ConnectorPreview', () => {
    it.each(STYLES)('renders an SVG for "%s" style', (style) => {
        const { container } = render(<ConnectorPreview style={style} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('sets aria-hidden on the SVG', () => {
        const { container } = render(<ConnectorPreview style="solid" />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not have role="img" (purely decorative)', () => {
        const { container } = render(<ConnectorPreview style="solid" />);
        const svg = container.querySelector('svg');
        expect(svg).not.toHaveAttribute('role');
    });

    it('renders no dasharray for solid style', () => {
        const { container } = render(<ConnectorPreview style="solid" />);
        const line = container.querySelector('line');
        expect(line).not.toHaveAttribute('stroke-dasharray');
    });

    it('renders dasharray for dashed style', () => {
        const { container } = render(<ConnectorPreview style="dashed" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-dasharray', '8 4');
    });

    it('renders dasharray for dotted style', () => {
        const { container } = render(<ConnectorPreview style="dotted" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-dasharray', '2 4');
    });

    it('renders dasharray for subtle style', () => {
        const { container } = render(<ConnectorPreview style="subtle" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-dasharray', '4 2');
    });

    it('renders reduced opacity for subtle style', () => {
        const { container } = render(<ConnectorPreview style="subtle" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-opacity', '0.5');
    });

    it('renders thicker line for thick style', () => {
        const { container } = render(<ConnectorPreview style="thick" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-width', '3');
    });
});
