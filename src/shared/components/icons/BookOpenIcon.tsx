import type { SVGProps } from 'react';

export function BookOpenIcon({
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
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
        </svg>
    );
}
