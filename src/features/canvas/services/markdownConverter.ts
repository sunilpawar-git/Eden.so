/**
 * Markdown Converter - Markdown <-> HTML conversion for TipTap editor
 * Uses unified/remark/rehype pipeline with custom AST plugins for
 * robust parsing and TipTap-compatible output.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeWrapListItems, rehypeFixOlContinuity, rehypeCompact } from './rehypePlugins';

/** Unified processor — built once, reused for every conversion */
const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeCompact)           // Strip whitespace text nodes first
    .use(rehypeWrapListItems)     // Then wrap bare <li> content in <p>
    .use(rehypeFixOlContinuity)   // Then fix sequential <ol> numbering
    .use(rehypeStringify);

/** Convert markdown string to HTML for TipTap consumption */
export function markdownToHtml(markdown: string): string {
    if (!markdown) return '';
    return String(processor.processSync(markdown));
}

/** Convert HTML string to markdown for store persistence */
export function htmlToMarkdown(html: string): string {
    if (!html) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    return nodeToMarkdown(doc.body).trim();
}

/** Heading tag to markdown prefix mapping */
const HEADING_PREFIXES: Record<string, string> = {
    h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ',
};

/** Tags that represent block-level elements requiring newline separation */
const BLOCK_TAGS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'img',
]);

/** Recursively convert DOM node tree to markdown */
function nodeToMarkdown(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    // Container elements (div, body) join block children with newlines
    if (tag === 'div' || tag === 'body') {
        return joinBlockChildren(el);
    }

    const childMd = Array.from(el.childNodes).map(nodeToMarkdown).join('');
    return elementToMarkdown(el, tag, childMd);
}

/** Join block-level children with blank-line separators for unambiguous markdown */
function joinBlockChildren(el: Element): string {
    const parts: string[] = [];
    for (const child of Array.from(el.childNodes)) {
        const md = nodeToMarkdown(child);
        if (!md) continue;
        if (child.nodeType !== Node.ELEMENT_NODE) { parts.push(md); continue; }
        const tag = (child as Element).tagName.toLowerCase();
        if (BLOCK_TAGS.has(tag) && parts.length > 0) {
            parts.push('\n\n');
        }
        parts.push(md);
    }
    return parts.join('');
}

/** Convert a single element to markdown based on its tag */
function elementToMarkdown(el: Element, tag: string, childMd: string): string {
    if (tag === 'strong' || tag === 'b') return `**${childMd}**`;
    if (tag === 'em' || tag === 'i') return `*${childMd}*`;
    if (tag === 'code') return codeToMarkdown(el, childMd);
    if (tag === 'img') return imageToMarkdown(el);
    if (tag in HEADING_PREFIXES) return `${HEADING_PREFIXES[tag]}${childMd}`;
    if (tag === 'blockquote') return `> ${childMd.replace(/\n/g, '')}`;
    if (tag === 'pre') return `\`\`\`\n${childMd}\`\`\``;
    if (tag === 'ul') return convertList(el, false);
    if (tag === 'ol') return convertList(el, true);
    if (tag === 'li') return childMd.replace(/^\n+|\n+$/g, '');
    if (tag === 'br') return '\n';
    return childMd;
}

/** Handle code element (inline vs inside pre) */
function codeToMarkdown(el: Element, childMd: string): string {
    if (el.parentElement?.tagName.toLowerCase() === 'pre') return childMd;
    return `\`${childMd}\``;
}

/** Convert img element to markdown image syntax */
function imageToMarkdown(el: Element): string {
    const src = el.getAttribute('src') ?? '';
    const rawAlt = el.getAttribute('alt') ?? '';
    if (!src) return '';
    const safeAlt = rawAlt.replace(/[[\]]/g, '');
    return `![${safeAlt}](${src})`;
}

/** Convert list element to markdown */
function convertList(el: Element, ordered: boolean): string {
    const parsed = parseInt(el.getAttribute('start') ?? '1', 10);
    const safeStart = Number.isNaN(parsed) ? 1 : parsed;
    const start = ordered ? safeStart : 0;
    const items = Array.from(el.children);
    return items
        .map((li, idx) => {
            const prefix = ordered ? `${start + idx}. ` : '- ';
            return `${prefix}${nodeToMarkdown(li)}`;
        })
        .join('\n');
}
