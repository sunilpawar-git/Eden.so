/**
 * Free Flow Icon - Scatter/network nodes indicator
 */
import type { SVGProps } from 'react';

export function FreeFlowIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <circle cx="5" cy="6" r="2" />
            <circle cx="19" cy="5" r="2" />
            <circle cx="12" cy="19" r="2" />
            <path d="M6.7 7.5 11 17.5" />
            <path d="M17.3 6.5 13 17.5" />
        </svg>
    );
}
