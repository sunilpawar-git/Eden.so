/**
 * Memory Chip Icon — represents per-node AI Memory pool membership
 */
interface MemoryChipIconProps {
    size?: number;
    className?: string;
    filled?: boolean;
}

export function MemoryChipIcon({ size = 24, className, filled = false }: MemoryChipIconProps) {
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
            <rect x="6" y="6" width="12" height="12" rx="1" />
            <circle cx="12" cy="12" r="2" />
            <line x1="6" y1="10" x2="3" y2="10" />
            <line x1="6" y1="14" x2="3" y2="14" />
            <line x1="18" y1="10" x2="21" y2="10" />
            <line x1="18" y1="14" x2="21" y2="14" />
            <line x1="10" y1="6" x2="10" y2="3" />
            <line x1="14" y1="6" x2="14" y2="3" />
            <line x1="10" y1="18" x2="10" y2="21" />
            <line x1="14" y1="18" x2="14" y2="21" />
        </svg>
    );
}
