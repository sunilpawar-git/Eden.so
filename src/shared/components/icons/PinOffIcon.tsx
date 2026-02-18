/**
 * Pin Off Icon component — unpinned state
 */
interface PinOffIconProps {
    size?: number;
    className?: string;
    filled?: boolean;
}

export function PinOffIcon({ size = 24, className, filled = false }: PinOffIconProps) {
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
        >
            <line x1="2" y1="2" x2="22" y2="22" />
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M9 4h9a2 2 0 0 1 2 2v5l-2 1v4" />
            <path d="M5 17h9.3" />
            <path d="M9 9h-.3" />
        </svg>
    );
}
