/**
 * ConnectorPreview — Inline SVG preview for connector styles.
 * Uses currentColor so it inherits from parent CSS color.
 */
import type { ConnectorStyle } from '@/shared/stores/settingsStore';

interface ConnectorPreviewProps {
    style: ConnectorStyle;
}

interface LineAttrs {
    strokeDasharray?: string;
    strokeOpacity?: string;
    strokeWidth?: string;
}

const STYLE_ATTRS: Record<ConnectorStyle, LineAttrs> = {
    solid: {},
    subtle: { strokeDasharray: '4 2', strokeOpacity: '0.5' },
    thick: { strokeWidth: '3' },
    dashed: { strokeDasharray: '8 4' },
    dotted: { strokeDasharray: '2 4' },
};

export function ConnectorPreview({ style }: ConnectorPreviewProps) {
    const attrs = STYLE_ATTRS[style];
    return (
        <svg
            width="40"
            height="12"
            aria-hidden="true"
        >
            <line
                x1="2"
                y1="6"
                x2="38"
                y2="6"
                stroke="currentColor"
                strokeWidth={attrs.strokeWidth ?? '2'}
                strokeLinecap="round"
                {...(attrs.strokeDasharray ? { strokeDasharray: attrs.strokeDasharray } : {})}
                {...(attrs.strokeOpacity ? { strokeOpacity: attrs.strokeOpacity } : {})}
            />
        </svg>
    );
}
