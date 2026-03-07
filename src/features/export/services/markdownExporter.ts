/**
 * markdownExporter — Converts BranchNode trees into structured markdown.
 * Pure function, no side effects.
 */
import type { BranchNode } from './branchTraversal';
import { exportStrings } from '../strings/exportStrings';

const MAX_HEADING_DEPTH = 6;

function headingPrefix(depth: number): string {
    const level = Math.min(depth + 1, MAX_HEADING_DEPTH);
    return '#'.repeat(level);
}

function renderNode(node: BranchNode, lines: string[]): void {
    const prefix = headingPrefix(node.depth);

    if (node.heading) {
        const label = node.isSynthesis ? `[Synthesis] ${node.heading}` : node.heading;
        lines.push(`${prefix} ${label}`);
        lines.push('');
    }

    if (node.isSynthesis && node.synthesisSourceCount > 0) {
        lines.push(`*${exportStrings.sections.synthesizedFrom} ${node.synthesisSourceCount} ${exportStrings.sections.ideas}*`);
        lines.push('');
    }

    if (node.content) {
        lines.push(node.content);
        lines.push('');
    }

    if (node.attachments.length > 0) {
        lines.push(`**${exportStrings.sections.attachments}:**`);
        for (const att of node.attachments) {
            lines.push(`- ${att.filename} \u2014 ${att.summary}`);
        }
        lines.push('');
    }

    if (node.tags.length > 0) {
        lines.push(`**${exportStrings.sections.tags}:** ${node.tags.join(', ')}`);
        lines.push('');
    }

    for (const child of node.children) {
        renderNode(child, lines);
    }
}

export function branchToMarkdown(roots: readonly BranchNode[]): string {
    if (roots.length === 0) return '';

    const lines: string[] = [];

    for (let i = 0; i < roots.length; i++) {
        const root = roots[i];
        if (!root) continue;
        if (i > 0) {
            lines.push('---');
            lines.push('');
        }
        renderNode(root, lines);
    }

    lines.push('---');
    lines.push('');
    lines.push(`*${exportStrings.sections.generatedBy}*`);
    lines.push('');

    return `${lines.join('\n').trimEnd()}\n`;
}
