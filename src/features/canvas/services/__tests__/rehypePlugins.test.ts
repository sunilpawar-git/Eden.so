/**
 * rehypePlugins Unit Tests - Tests each plugin in isolation on hast trees
 */
import { describe, it, expect } from 'vitest';
import type { Root, Element, Text, Properties } from 'hast';
import { rehypeWrapListItems, rehypeFixOlContinuity, rehypeCompact } from '../rehypePlugins';

/** Helper: create a text node */
const text = (value: string): Text => ({ type: 'text', value });

/** Helper: create an element node */
const el = (tagName: string, children: Array<Element | Text> = [], props: Properties = {}): Element => ({
    type: 'element',
    tagName,
    properties: { ...props },
    children,
});

/** Helper: create a root node */
const root = (children: Array<Element | Text>): Root => ({
    type: 'root',
    children,
});

describe('rehypeWrapListItems', () => {
    const plugin = rehypeWrapListItems();

    it('wraps bare text in li with p', () => {
        const tree = root([
            el('ul', [el('li', [text('Hello')])]),
        ]);
        plugin(tree);
        const li = (tree.children[0] as Element).children[0] as Element;
        expect(li.children).toHaveLength(1);
        expect((li.children[0] as Element).tagName).toBe('p');
        expect((li.children[0] as Element).children[0]).toEqual(text('Hello'));
    });

    it('skips li that already has p as first child', () => {
        const tree = root([
            el('ul', [el('li', [el('p', [text('Already wrapped')])])]),
        ]);
        plugin(tree);
        const li = (tree.children[0] as Element).children[0] as Element;
        expect(li.children).toHaveLength(1);
        expect((li.children[0] as Element).tagName).toBe('p');
    });

    it('keeps nested ul outside of p wrapper', () => {
        const nestedUl = el('ul', [el('li', [text('Child')])]);
        const tree = root([
            el('ol', [el('li', [text('Parent'), nestedUl])]),
        ]);
        plugin(tree);
        const li = (tree.children[0] as Element).children[0] as Element;
        // First child should be <p>Parent</p>
        expect((li.children[0] as Element).tagName).toBe('p');
        expect((li.children[0] as Element).children).toEqual([text('Parent')]);
        // Second child should be the nested <ul>, NOT inside <p>
        expect((li.children[1] as Element).tagName).toBe('ul');
    });

    it('keeps nested ol outside of p wrapper', () => {
        const nestedOl = el('ol', [el('li', [text('Sub')])]);
        const tree = root([
            el('ul', [el('li', [text('Top'), nestedOl])]),
        ]);
        plugin(tree);
        const li = (tree.children[0] as Element).children[0] as Element;
        expect((li.children[0] as Element).tagName).toBe('p');
        expect((li.children[1] as Element).tagName).toBe('ol');
    });
});

describe('rehypeFixOlContinuity', () => {
    const plugin = rehypeFixOlContinuity();

    it('adds start to second sequential ol', () => {
        const tree = root([
            el('ol', [el('li', [text('A')]), el('li', [text('B')])]),
            el('ul', [el('li', [text('bullet')])]),
            el('ol', [el('li', [text('C')])]),
        ]);
        plugin(tree);
        const secondOl = tree.children[2] as Element;
        expect(secondOl.properties.start).toBe(3);
    });

    it('does not add start to first ol', () => {
        const tree = root([
            el('ol', [el('li', [text('A')])]),
        ]);
        plugin(tree);
        expect((tree.children[0] as Element).properties.start).toBeUndefined();
    });

    it('resets count after heading', () => {
        const tree = root([
            el('ol', [el('li', [text('A')]), el('li', [text('B')])]),
            el('h2', [text('Section')]),
            el('ol', [el('li', [text('C')])]),
        ]);
        plugin(tree);
        const secondOl = tree.children[2] as Element;
        expect(secondOl.properties.start).toBeUndefined();
    });

    it('resets count after hr', () => {
        const tree = root([
            el('ol', [el('li', [text('A')])]),
            el('hr'),
            el('ol', [el('li', [text('B')])]),
        ]);
        plugin(tree);
        expect((tree.children[2] as Element).properties.start).toBeUndefined();
    });

    it('accumulates across multiple ol blocks', () => {
        const tree = root([
            el('ol', [el('li', [text('1')])]),
            el('p', [text('gap')]),
            el('ol', [el('li', [text('2')]), el('li', [text('3')])]),
            el('p', [text('gap')]),
            el('ol', [el('li', [text('4')])]),
        ]);
        plugin(tree);
        expect((tree.children[2] as Element).properties.start).toBe(2);
        expect((tree.children[4] as Element).properties.start).toBe(4);
    });
});

describe('rehypeCompact', () => {
    const plugin = rehypeCompact();

    it('strips whitespace text nodes from root', () => {
        const tree = root([
            el('p', [text('Hello')]),
            text('\n'),
            el('p', [text('World')]),
        ]);
        plugin(tree);
        expect(tree.children).toHaveLength(2);
        expect((tree.children[0] as Element).tagName).toBe('p');
        expect((tree.children[1] as Element).tagName).toBe('p');
    });

    it('strips whitespace from block containers', () => {
        const tree = root([
            el('ul', [text('\n'), el('li', [text('Item')]), text('\n')]),
        ]);
        plugin(tree);
        const ul = tree.children[0] as Element;
        expect(ul.children).toHaveLength(1);
        expect((ul.children[0] as Element).tagName).toBe('li');
    });

    it('preserves whitespace inside pre elements', () => {
        const tree = root([
            el('pre', [text('\n'), el('code', [text('  indented\n')])]),
        ]);
        plugin(tree);
        const pre = tree.children[0] as Element;
        // Whitespace text node should be preserved
        expect(pre.children).toHaveLength(2);
    });

    it('preserves non-whitespace text nodes', () => {
        const tree = root([
            el('ul', [el('li', [text('Keep me')])]),
        ]);
        plugin(tree);
        const li = (tree.children[0] as Element).children[0] as Element;
        expect((li.children[0] as Text).value).toBe('Keep me');
    });
});
