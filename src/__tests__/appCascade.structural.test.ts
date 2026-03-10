/**
 * App.tsx — Structural tests preventing cascade re-renders.
 *
 * H2: WorkspaceContext value must be memoized (useMemo) to prevent all
 *     consumers from re-rendering on every AuthenticatedApp render.
 * M7: useEffect must depend on user?.id (scalar), not the user object ref.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf-8');

describe('App.tsx — cascade prevention', () => {
    it('WorkspaceContext value is memoized with useMemo (H2)', () => {
        expect(SRC).toContain('useMemo');
        const wsCtxPattern = /useMemo\(\s*\(\)\s*=>\s*\(\{[^}]*currentWorkspaceId/;
        expect(
            wsCtxPattern.test(SRC),
            'wsCtx must be wrapped in useMemo(() => ({ currentWorkspaceId, ... }), [...])',
        ).toBe(true);
    });

    it('useEffect for pinned/subscription depends on userId, not user object (M7)', () => {
        const effectBlock = SRC.slice(
            SRC.indexOf('loadPinnedIds') - 200,
            SRC.indexOf('loadPinnedIds') + 200,
        );
        expect(effectBlock).not.toMatch(/\},\s*\[user\]\s*\)/);
        expect(
            effectBlock.includes('userId') || effectBlock.includes('user?.id'),
            'Effect deps must use userId (scalar) not user (object)',
        ).toBe(true);
    });

    it('settings handlers use useCallback (not inline arrows in JSX)', () => {
        expect(SRC).toContain('useCallback');
        expect(SRC).not.toMatch(/onOpenSettings=\{?\s*\(\)\s*=>/);
        expect(SRC).not.toMatch(/onSettingsClick=\{?\s*\(\)\s*=>/);
        expect(SRC).not.toMatch(/onClose=\{?\s*\(\)\s*=>/);
    });
});
