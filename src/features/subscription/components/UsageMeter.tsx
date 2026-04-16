/**
 * UsageMeter — Progress bar showing current/max for a usage limit.
 * Uses CSS variables for colors. Spacing via style props.
 */

interface UsageMeterProps {
    readonly current: number;
    readonly max: number;
    readonly label: string;
}

export function UsageMeter({ current, max, label }: UsageMeterProps) {
    const isInfinite = !Number.isFinite(max);
    const percentage = isInfinite ? 0 : Math.min((current / max) * 100, 100);
    const isNearLimit = percentage >= 80;

    return (
        <div style={{ marginBottom: 8 }}>
            <div
                className="flex justify-between text-[var(--color-text-secondary)]"
                style={{ fontSize: 'var(--font-size-xs)', marginBottom: 4 }}
            >
                <span>{label}</span>
                <span>{current}/{isInfinite ? '∞' : max}</span>
            </div>
            <div
                className="rounded-[var(--radius-sm)] overflow-clip"
                style={{ height: 6, background: 'var(--color-border)' }}
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={0}
                aria-valuemax={isInfinite ? undefined : max}
                aria-label={label}
            >
                <div
                    className="h-full rounded-[var(--radius-sm)] transition-all duration-300"
                    style={{
                        width: `${percentage}%`,
                        background: isNearLimit
                            ? 'var(--color-warning)'
                            : 'var(--color-primary)',
                    }}
                />
            </div>
        </div>
    );
}
