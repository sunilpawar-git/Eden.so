/**
 * String resource tests for duplicate/share node actions
 */
import { describe, it, expect } from 'vitest';
import { strings } from '../strings';

describe('strings.nodeUtils — duplicate/share keys', () => {
    it('has duplicate label', () => {
        expect(strings.nodeUtils.duplicate).toBe('Duplicate');
    });

    it('has duplicateSuccess message', () => {
        expect(strings.nodeUtils.duplicateSuccess).toBe('Node duplicated');
    });

    it('has duplicateError message', () => {
        expect(strings.nodeUtils.duplicateError).toBe('Failed to duplicate node');
    });

    it('has share label', () => {
        expect(strings.nodeUtils.share).toBe('Share');
    });

    it('has shareToWorkspace label', () => {
        expect(strings.nodeUtils.shareToWorkspace).toBe('Share to workspace');
    });

    it('has shareSuccess message', () => {
        expect(strings.nodeUtils.shareSuccess).toBe('Node shared successfully');
    });

    it('has shareError message', () => {
        expect(strings.nodeUtils.shareError).toBe('Failed to share node');
    });

    it('has noOtherWorkspaces message', () => {
        expect(strings.nodeUtils.noOtherWorkspaces).toBe('No other workspaces available');
    });
});
