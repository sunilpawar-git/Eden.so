/**
 * AttachmentExtension Tests — TipTap node attrs, parseHTML, renderHTML
 */
import { describe, it, expect } from 'vitest';
import { AttachmentExtension } from '../attachmentExtension';
import type { AttachmentStatus } from '../attachmentExtension';

describe('AttachmentExtension', () => {
    it('has the correct node name', () => {
        expect(AttachmentExtension.name).toBe('attachment');
    });

    it('is defined as a block-level atom', () => {
        const config = AttachmentExtension.config as unknown as Record<string, unknown>;
        expect(config.atom).toBe(true);
        expect(config.group).toBe('block');
    });

    describe('attrs', () => {
        interface ExtConfig { addAttributes?: () => Record<string, { default: unknown }> }
        const extConfig = (AttachmentExtension.config as unknown) as ExtConfig;
        const attrsDef = extConfig.addAttributes?.() ?? {};

        it('url defaults to empty string', () => {
            expect(attrsDef.url?.default).toBe('');
        });

        it('filename defaults to empty string', () => {
            expect(attrsDef.filename?.default).toBe('');
        });

        it('thumbnailUrl defaults to null', () => {
            expect(attrsDef.thumbnailUrl?.default).toBeNull();
        });

        it('status defaults to ready', () => {
            const def = attrsDef.status?.default as AttachmentStatus;
            expect(def).toBe('ready');
        });

        it('tempId defaults to null', () => {
            expect(attrsDef.tempId?.default).toBeNull();
        });
    });
});
