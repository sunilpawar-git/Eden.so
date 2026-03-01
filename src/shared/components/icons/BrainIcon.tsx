/**
 * Brain Icon — represents workspace-level AI Memory pool toggle
 */
interface BrainIconProps {
    size?: number;
    className?: string;
    filled?: boolean;
}

export function BrainIcon({ size = 24, className, filled = false }: BrainIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            <path d="M12 2a5 5 0 0 1 4.5 2.8A4 4 0 0 1 20 9a4 4 0 0 1-1 7.5V20a2 2 0 0 1-2 2h-2" />
            <path d="M12 2a5 5 0 0 0-4.5 2.8A4 4 0 0 0 4 9a4 4 0 0 0 1 7.5V20a2 2 0 0 0 2 2h2" />
            <path d="M12 2v20" />
            <path d="M8 10h.01" />
            <path d="M16 10h.01" />
            <path d="M8 14h.01" />
            <path d="M16 14h.01" />
        </svg>
    );
}
