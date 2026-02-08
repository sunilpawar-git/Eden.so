/**
 * Markdown Converter - Pure functions for markdown <-> HTML conversion
 * Handles the subset supported by TipTap StarterKit:
 * bold, italic, headings, lists, code, blockquote
 */

/** Convert markdown string to HTML for TipTap consumption */
export function markdownToHtml(markdown: string): string {
    if (!markdown) return '';

    const lines = markdown.split('\n');
    const htmlParts: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i] ?? '';
        const result = parseLine(lines, i, line);
        if (result.html) htmlParts.push(result.html);
        i = result.nextIndex;
    }

    return htmlParts.join('');
}

/** Parse a single line or block, returning HTML and the next line index */
function parseLine(lines: string[], i: number, line: string): { html: string; nextIndex: number } {
    if (line.startsWith('```')) return parseCodeBlock(lines, i);

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
        const level = (headingMatch[1] ?? '').length;
        return { html: `<h${level}>${convertInline(headingMatch[2] ?? '')}</h${level}>`, nextIndex: i + 1 };
    }

    if (line.startsWith('> ')) {
        return { html: `<blockquote><p>${convertInline(line.slice(2))}</p></blockquote>`, nextIndex: i + 1 };
    }

    if (/^[-*+]\s/.test(line)) return parseList(lines, i, /^[-*+]\s/, 'ul');
    if (/^\d+\.\s/.test(line)) return parseList(lines, i, /^\d+\.\s/, 'ol');
    if (line.trim() === '') return { html: '', nextIndex: i + 1 };

    return { html: `<p>${convertInline(line)}</p>`, nextIndex: i + 1 };
}

/** Parse a fenced code block (```...```) */
function parseCodeBlock(lines: string[], startIndex: number): { html: string; nextIndex: number } {
    const codeLines: string[] = [];
    let i = startIndex + 1;
    while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
    }
    return { html: `<pre><code>${codeLines.join('\n')}\n</code></pre>`, nextIndex: i + 1 };
}

/** Parse a contiguous list block (ul or ol) */
function parseList(
    lines: string[], startIndex: number, pattern: RegExp, tag: string
): { html: string; nextIndex: number } {
    const items: string[] = [];
    let i = startIndex;
    while (i < lines.length && pattern.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(pattern, ''));
        i++;
    }
    const lis = items.map((item) => `<li><p>${convertInline(item)}</p></li>`).join('');
    return { html: `<${tag}>${lis}</${tag}>`, nextIndex: i };
}

/** Convert inline markdown (bold, italic, code) to HTML */
function convertInline(text: string): string {
    return text
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Convert HTML string to markdown for store persistence */
export function htmlToMarkdown(html: string): string {
    if (!html) return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return nodeToMarkdown(tempDiv).trim();
}

/** Heading tag to markdown prefix mapping */
const HEADING_PREFIXES: Record<string, string> = {
    h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ',
};

/** Tags that represent block-level elements requiring newline separation */
const BLOCK_TAGS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre',
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

/** Join block-level children with newline separators */
function joinBlockChildren(el: Element): string {
    const parts: string[] = [];
    let prevTag = '';
    for (const child of Array.from(el.childNodes)) {
        const md = nodeToMarkdown(child);
        if (!md) continue;
        if (child.nodeType !== Node.ELEMENT_NODE) { parts.push(md); continue; }
        const tag = (child as Element).tagName.toLowerCase();
        if (BLOCK_TAGS.has(tag) && parts.length > 0) {
            // Consecutive paragraphs need blank line (markdown paragraph break)
            const sep = tag === 'p' && prevTag === 'p' ? '\n\n' : '\n';
            parts.push(sep);
        }
        parts.push(md);
        prevTag = tag;
    }
    return parts.join('');
}

/** Convert a single element to markdown based on its tag */
function elementToMarkdown(el: Element, tag: string, childMd: string): string {
    if (tag === 'strong' || tag === 'b') return `**${childMd}**`;
    if (tag === 'em' || tag === 'i') return `*${childMd}*`;
    if (tag === 'code') return codeToMarkdown(el, childMd);
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

/** Convert list element to markdown */
function convertList(el: Element, ordered: boolean): string {
    const items = Array.from(el.children);
    return items
        .map((li, idx) => {
            const prefix = ordered ? `${idx + 1}. ` : '- ';
            return `${prefix}${nodeToMarkdown(li)}`;
        })
        .join('\n');
}
