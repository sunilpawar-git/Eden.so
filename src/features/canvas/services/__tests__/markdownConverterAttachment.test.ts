/**
 * markdownConverter — attachment round-trip serialization tests
 * Validates that attachment nodes survive the HTML <-> markdown round-trip
 */
import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, markdownToHtml, attachmentElementToMarkdown } from '../markdownConverter';

describe('attachmentElementToMarkdown', () => {
    it('serializes an attachment div to raw HTML with data-attachment', () => {
        const doc = new DOMParser().parseFromString(
            `<div data-attachment='{"url":"https://cdn.example.com/a.pdf","filename":"a.pdf","thumbnailUrl":null}'></div>`,
            'text/html',
        );
        const el = doc.querySelector('div[data-attachment]')!;
        const result = attachmentElementToMarkdown(el);

        expect(result).toContain('data-attachment');
        expect(result).toContain('a.pdf');
    });

    it('handles missing data-attachment gracefully (empty payload)', () => {
        const doc = new DOMParser().parseFromString('<div data-attachment></div>', 'text/html');
        const el = doc.querySelector('div[data-attachment]')!;
        const result = attachmentElementToMarkdown(el);
        expect(result).toContain('data-attachment');
    });
});

describe('htmlToMarkdown — attachment node round-trip', () => {
    it('preserves attachment div as raw HTML in markdown', () => {
        const payload = JSON.stringify({ url: 'https://cdn.example.com/doc.pdf', filename: 'doc.pdf', thumbnailUrl: null });
        const html = `<div data-attachment='${payload}'></div>`;
        const md = htmlToMarkdown(html);

        expect(md).toContain('data-attachment');
        expect(md).toContain('doc.pdf');
    });
});

describe('markdownToHtml — attachment node round-trip', () => {
    it('passes raw attachment HTML through the pipeline unchanged', () => {
        const payload = JSON.stringify({ url: 'https://cdn.example.com/doc.pdf', filename: 'doc.pdf', thumbnailUrl: null });
        const rawHtml = `<div data-attachment='${payload}'></div>`;
        const md = htmlToMarkdown(rawHtml);
        const backToHtml = markdownToHtml(md);

        expect(backToHtml).toContain('data-attachment');
    });
});

describe('full edit-mode transition round-trip', () => {
    const FIREBASE_URL = 'https://firebasestorage.googleapis.com/v0/b/eden-alpha.appspot.com/o/docs%2Ftest.pdf?alt=media&token=abc';
    const PAYLOAD = { url: FIREBASE_URL, filename: 'OLQ.pdf', thumbnailUrl: null, mimeType: 'application/pdf' };

    it('single attachment survives full round-trip', () => {
        const tiptapHtml = `<div data-attachment="${JSON.stringify(PAYLOAD).replace(/"/g, '&quot;')}" class="attachment-node"></div>`;
        const md = htmlToMarkdown(tiptapHtml);
        const restoredHtml = markdownToHtml(md);

        const doc = new DOMParser().parseFromString(restoredHtml, 'text/html');
        const el = doc.querySelector('div[data-attachment]');
        expect(el).not.toBeNull();
        const parsed = JSON.parse(el!.getAttribute('data-attachment')!);
        expect(parsed.url).toBe(FIREBASE_URL);
        expect(parsed.filename).toBe('OLQ.pdf');
    });

    it('two consecutive attachments survive the full round-trip', () => {
        const att = `<div data-attachment="${JSON.stringify(PAYLOAD).replace(/"/g, '&quot;')}" class="attachment-node"></div>`;
        const tiptapHtml = `${att}${att}`;
        const md = htmlToMarkdown(tiptapHtml);
        const restoredHtml = markdownToHtml(md);

        const doc = new DOMParser().parseFromString(restoredHtml, 'text/html');
        expect(doc.querySelectorAll('div[data-attachment]').length).toBe(2);
    });

    it('empty paragraph + attachment survives round-trip', () => {
        const attJson = JSON.stringify(PAYLOAD);
        const tiptapGetHtml = `<p></p><div data-attachment='${attJson}' class="attachment-node"></div>`;
        const md = htmlToMarkdown(tiptapGetHtml);
        const restoredHtml = markdownToHtml(md);

        const doc = new DOMParser().parseFromString(restoredHtml, 'text/html');
        expect(doc.querySelector('div[data-attachment]')).not.toBeNull();
    });

    it('attachment inside ReactNodeViewWrapper survives round-trip', () => {
        const attJson = JSON.stringify(PAYLOAD);
        const tiptapGetHtml = `<div data-node-view-wrapper="" class="react-renderer node-attachment"><div data-attachment='${attJson}' class="attachment-node"></div></div>`;
        const md = htmlToMarkdown(tiptapGetHtml);
        const restoredHtml = markdownToHtml(md);

        const doc = new DOMParser().parseFromString(restoredHtml, 'text/html');
        expect(doc.querySelector('div[data-attachment]')).not.toBeNull();
    });

    it('saveContent idempotency: attachment-only content is unchanged after round-trip', () => {
        const storeOutput = `<div data-attachment='${JSON.stringify(PAYLOAD)}'></div>`;
        const html = markdownToHtml(storeOutput);
        const savedMd = htmlToMarkdown(html);
        expect(savedMd).toBe(storeOutput);
    });
});

describe('htmlToMarkdown — attachment block separation (Bug: PDF vanishes on edit)', () => {
    const PAYLOAD = {
        url: 'https://firebasestorage.googleapis.com/v0/b/eden-alpha.appspot.com/o/docs%2Ftest.pdf?alt=media&token=abc',
        filename: 'OLQ.pdf', thumbnailUrl: null, mimeType: 'application/pdf',
    };

    it('inserts blank-line separator between text paragraph and attachment div', () => {
        const html = `<p>My notes</p><div data-attachment='${JSON.stringify(PAYLOAD)}'></div>`;
        const md = htmlToMarkdown(html);

        expect(md).toContain('\n\n<div data-attachment');
    });

    it('text + attachment survives two round-trips without <div> ending up inside <p>', () => {
        const html = `<p>My notes</p><div data-attachment='${JSON.stringify(PAYLOAD)}'></div>`;
        const md1 = htmlToMarkdown(html);
        const html1 = markdownToHtml(md1);
        const md2 = htmlToMarkdown(html1);
        const html2 = markdownToHtml(md2);

        const doc = new DOMParser().parseFromString(html2, 'text/html');
        expect(doc.querySelector('div[data-attachment]')).not.toBeNull();
        expect(html2).not.toContain('<p>My notes<div');
    });

    it('attachment with text before it: markdownToHtml keeps attachment at block level', () => {
        const att = `<div data-attachment='${JSON.stringify(PAYLOAD)}'></div>`;
        const tiptapHtml = `<p>Some heading text</p>${att}`;
        const md = htmlToMarkdown(tiptapHtml);
        const restoredHtml = markdownToHtml(md);

        expect(restoredHtml).not.toContain('<p>Some heading text<div');
        const doc = new DOMParser().parseFromString(restoredHtml, 'text/html');
        expect(doc.querySelector('div[data-attachment]')).not.toBeNull();
    });
});
