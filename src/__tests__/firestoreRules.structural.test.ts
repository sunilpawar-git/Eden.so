/**
 * Structural test: Firestore security rules defense-in-depth.
 * Verifies that node and edge write rules include userId validation.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const RULES_PATH = path.resolve(__dirname, '..', '..', 'firestore.rules');

describe('Firestore rules defense-in-depth', () => {
    const content = fs.readFileSync(RULES_PATH, 'utf-8');

    it('firestore.rules exists and is non-empty', () => {
        expect(content.length).toBeGreaterThan(0);
    });

    it('default deny rule exists', () => {
        expect(content).toContain('allow read, write: if false');
    });

    it('nodes write rule validates resource.data.userId', () => {
        const nodesSection = content.slice(
            content.indexOf('match /nodes/{nodeId}'),
            content.indexOf('match /edges/{edgeId}')
        );
        expect(nodesSection).toContain('resource.data.userId');
        expect(nodesSection).toContain('request.auth.uid');
    });

    it('edges write rule validates resource.data.userId', () => {
        const edgesSection = content.slice(
            content.indexOf('match /edges/{edgeId}'),
            content.indexOf('match /knowledgeBank/{entryId}')
        );
        expect(edgesSection).toContain('resource.data.userId');
        expect(edgesSection).toContain('request.auth.uid');
    });

    it('nodes and edges use backward-compatible check (!resource.data.userId)', () => {
        expect(content).toContain('!resource.data.userId || resource.data.userId == request.auth.uid');
    });
});
