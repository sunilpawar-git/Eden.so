/**
 * Structural test: Firestore rules coverage
 *
 * Verifies that every Firestore subcollection referenced in service code
 * has a matching rule in firestore.rules. Prevents regressions where a
 * new subcollection is added in code but forgotten in security rules.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '../../../..');

function readSource(relativePath: string): string {
    return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

/**
 * Extract subcollection names from service files.
 * Handles two patterns:
 *   1. Direct: collection(db, 'users', userId, 'workspaces', wsId, 'nodes')
 *   2. Helper: getSubcollectionRef(userId, wsId, 'nodes')
 */
function extractWorkspaceSubcollections(source: string): string[] {
    const subcollections = new Set<string>();

    // Pattern 1: Direct Firestore calls with string literal subcollection
    const directRegex = /(?:collection|doc)\(\s*db\s*,\s*'users'\s*,\s*\w+\s*,\s*'workspaces'\s*,\s*\w+\s*,\s*'(\w+)'/g;
    let match;
    while ((match = directRegex.exec(source)) !== null) {
        if (match[1]) subcollections.add(match[1]);
    }

    // Pattern 2: Helper function calls like getSubcollectionRef(userId, wsId, 'nodes')
    const helperRegex = /getSubcollection(?:Ref|DocRef)\(\s*\w+\s*,\s*\w+\s*,\s*'(\w+)'/g;
    while ((match = helperRegex.exec(source)) !== null) {
        if (match[1]) subcollections.add(match[1]);
    }

    return [...subcollections];
}

/**
 * Extract rule match paths from firestore.rules.
 * Matches: match /knowledgeBank/{entryId} { ... }
 */
function extractRuleMatches(rulesSource: string): string[] {
    const regex = /match\s+\/(\w+)\/\{[^}]+\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(rulesSource)) !== null) {
        if (match[1]) matches.add(match[1]);
    }
    return [...matches];
}

describe('Firestore rules coverage', () => {
    const rulesSource = readSource('firestore.rules');
    const ruleMatches = extractRuleMatches(rulesSource);

    // All service files that reference Firestore subcollections under workspaces
    const serviceFiles = [
        'src/features/workspace/services/workspaceService.ts',
        'src/features/knowledgeBank/services/knowledgeBankService.ts',
    ];

    const allSubcollections = new Set<string>();
    for (const file of serviceFiles) {
        const source = readSource(file);
        for (const sub of extractWorkspaceSubcollections(source)) {
            allSubcollections.add(sub);
        }
    }

    it('should detect all workspace subcollections used in service code', () => {
        expect([...allSubcollections].sort()).toEqual(
            ['edges', 'knowledgeBank', 'nodes']
        );
    });

    it.each([...allSubcollections])(
        'firestore.rules must have a rule for workspace subcollection "%s"',
        (subcollection) => {
            expect(
                ruleMatches,
                `Missing Firestore rule for "${subcollection}". ` +
                `Add: match /${subcollection}/{id} { allow read, write: ... } in firestore.rules`
            ).toContain(subcollection);
        }
    );

    it('should cover nodes, edges, and knowledgeBank at minimum', () => {
        const required = ['nodes', 'edges', 'knowledgeBank'];
        for (const sub of required) {
            expect(ruleMatches, `Missing required rule for "${sub}"`).toContain(sub);
        }
    });
});
