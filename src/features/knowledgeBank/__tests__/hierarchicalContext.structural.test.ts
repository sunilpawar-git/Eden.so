/**
 * Structural test — Ensures hierarchical context builder is correctly wired
 * Validates imports, wrapper markers, and groupEntriesByDocument integration
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const HOOK_PATH = path.resolve(__dirname, '../hooks/useKnowledgeBankContext.ts');
const BUILDER_PATH = path.resolve(__dirname, '../services/hierarchicalContextBuilder.ts');

describe('hierarchical context structural tests', () => {
    it('hook imports buildHierarchicalKBContext', () => {
        const hookSource = fs.readFileSync(HOOK_PATH, 'utf-8');
        expect(hookSource).toContain('buildHierarchicalKBContext');
    });

    it('hook re-exports buildKBContextBlock for backward compat', () => {
        const hookSource = fs.readFileSync(HOOK_PATH, 'utf-8');
        expect(hookSource).toContain('export function buildKBContextBlock');
    });

    it('builder uses groupEntriesByDocument', () => {
        const builderSource = fs.readFileSync(BUILDER_PATH, 'utf-8');
        expect(builderSource).toContain('groupEntriesByDocument');
    });

    it('builder uses localized wrapper markers', () => {
        const builderSource = fs.readFileSync(BUILDER_PATH, 'utf-8');
        expect(builderSource).toContain('wrapperStart()');
        expect(builderSource).toContain('wrapperEnd()');
        expect(builderSource).toContain('strings.knowledgeBank.ai');
    });

    it('builder imports rankDocumentGroups for scoring', () => {
        const builderSource = fs.readFileSync(BUILDER_PATH, 'utf-8');
        expect(builderSource).toContain('rankDocumentGroups');
    });
});
