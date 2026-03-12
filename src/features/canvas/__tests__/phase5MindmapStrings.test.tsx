/**
 * Phase 5 — Mindmap Slash Command & Strings Integration Tests
 *
 * Split from phase5MindmapIntegration.test.tsx to stay within 300-line limit.
 * Validates slash command registry and string resource completeness.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import { filterCommands, getCommandById } from '../services/slashCommands';
import { strings } from '@/shared/localization/strings';

// ── 5. Slash command toggle integration ───────────────────────────────

describe('Slash command toggle-mindmap integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('toggle-mindmap command is accessible via getCommandById', () => {
        const cmd = getCommandById('toggle-mindmap');
        expect(cmd).toBeDefined();
        expect(cmd?.icon).toBe('🧠');
    });

    it('toggle-mindmap filterCommands matches "visual" keyword', () => {
        const results = filterCommands('visual');
        expect(results.some((c: { id: string }) => c.id === 'toggle-mindmap')).toBe(true);
    });

    it('toggle-mindmap filterCommands matches "tree" keyword', () => {
        const results = filterCommands('tree');
        expect(results.some((c: { id: string }) => c.id === 'toggle-mindmap')).toBe(true);
    });
});

// ── 6. String resources completeness ──────────────────────────────────

describe('Mindmap string resources', () => {
    it('has all required mindmap-related strings', () => {
        expect(strings.nodeUtils.mindmapView).toBe('Mindmap View');
        expect(strings.nodeUtils.textView).toBe('Text View');
        expect(strings.canvas.mindmap.ariaLabel).toBeDefined();
        expect(strings.canvas.mindmap.emptyFallback).toBeDefined();
        expect(strings.canvas.mindmap.errorFallback).toBeDefined();
    });

    it('has slash command toggle-mindmap label', () => {
        expect(strings.slashCommands.toggleMindmap.label).toBeDefined();
        expect(strings.slashCommands.toggleMindmap.description).toBeDefined();
    });
});
