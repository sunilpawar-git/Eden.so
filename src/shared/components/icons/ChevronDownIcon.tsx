import type { SVGProps } from 'react';

export function ChevronDownIcon({
    width = 24,
    height = 24,
    size,
    ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
    return (
        <svg
            width={size ?? width}
            height={size ?? height}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}
