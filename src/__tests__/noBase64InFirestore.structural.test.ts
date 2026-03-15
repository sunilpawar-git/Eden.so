/**
 * Structural test: All Firestore node writes must sanitize base64 images.
 * Verifies that stripBase64Images is imported and used in workspaceService.ts
 * before any setDoc/batch.set call that writes node data.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const WORKSPACE_SERVICE = path.resolve(
    __dirname, '..', 'features', 'workspace', 'services', 'workspaceService.ts'
);

describe('No base64 images in Firestore writes', () => {
    const content = fs.readFileSync(WORKSPACE_SERVICE, 'utf-8');

    it('workspaceService imports stripBase64Images', () => {
        expect(content).toContain('stripBase64Images');
    });

    it('appendNode uses stripBase64Images on node data', () => {
        const appendSection = content.slice(
            content.indexOf('function appendNode'),
            content.indexOf('function saveNodes')
        );
        expect(appendSection).toContain('stripBase64Images');
    });

    it('saveNodes uses stripBase64Images on node data', () => {
        const saveSection = content.slice(
            content.indexOf('function saveNodes'),
            content.indexOf('function saveEdges')
        );
        expect(saveSection).toContain('stripBase64Images');
    });
});
