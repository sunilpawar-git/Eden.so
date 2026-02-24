/**
 * rehypeUnwrapImages Unit Tests - Validates block-level image unwrapping from <p>
 */
import { describe, it, expect } from 'vitest';
import type { Root, Element, Text, Properties } from 'hast';
import { rehypeUnwrapImages } from '../rehypePlugins';

const text = (value: string): Text => ({ type: 'text', value });

const el = (tagName: string, children: Array<Element | Text> = [], props: Properties = {}): Element => ({
    type: 'element',
    tagName,
    properties: { ...props },
    children,
});

const root = (children: Array<Element | Text>): Root => ({
    type: 'root',
    children,
});

describe('rehypeUnwrapImages', () => {
    const plugin = rehypeUnwrapImages();

    it('unwraps standalone image from <p> wrapper', () => {
        const img = el('img', [], { src: 'https://x.com/a.jpg', alt: 'photo' });
        const tree = root([el('p', [img])]);
        plugin(tree);
        expect(tree.children).toHaveLength(1);
        expect((tree.children[0] as Element).tagName).toBe('img');
        expect((tree.children[0] as Element).properties.src).toBe('https://x.com/a.jpg');
    });

    it('does not unwrap mixed paragraph with text and image', () => {
        const tree = root([
            el('p', [text('Caption: '), el('img', [], { src: 'https://x.com/a.jpg' })]),
        ]);
        plugin(tree);
        expect((tree.children[0] as Element).tagName).toBe('p');
        expect((tree.children[0] as Element).children).toHaveLength(2);
    });

    it('unwraps multiple consecutive standalone images', () => {
        const tree = root([
            el('p', [el('img', [], { src: 'https://x.com/1.jpg' })]),
            el('p', [el('img', [], { src: 'https://x.com/2.jpg' })]),
        ]);
        plugin(tree);
        expect(tree.children).toHaveLength(2);
        expect((tree.children[0] as Element).tagName).toBe('img');
        expect((tree.children[1] as Element).tagName).toBe('img');
    });

    it('is a no-op for documents without images', () => {
        const tree = root([
            el('p', [text('Hello')]),
            el('p', [text('World')]),
        ]);
        plugin(tree);
        expect(tree.children).toHaveLength(2);
        expect((tree.children[0] as Element).tagName).toBe('p');
        expect((tree.children[1] as Element).tagName).toBe('p');
    });

    it('does not unwrap <p> with two images', () => {
        const tree = root([
            el('p', [
                el('img', [], { src: 'https://x.com/1.jpg' }),
                el('img', [], { src: 'https://x.com/2.jpg' }),
            ]),
        ]);
        plugin(tree);
        expect((tree.children[0] as Element).tagName).toBe('p');
        expect((tree.children[0] as Element).children).toHaveLength(2);
    });

    it('does not unwrap <p> with image and trailing whitespace', () => {
        const tree = root([
            el('p', [el('img', [], { src: 'https://x.com/a.jpg' }), text(' ')]),
        ]);
        plugin(tree);
        expect((tree.children[0] as Element).tagName).toBe('p');
        expect((tree.children[0] as Element).children).toHaveLength(2);
    });

    it('preserves non-p elements unchanged', () => {
        const tree = root([
            el('h1', [text('Title')]),
            el('p', [el('img', [], { src: 'https://x.com/a.jpg' })]),
            el('ul', [el('li', [text('Item')])]),
        ]);
        plugin(tree);
        expect((tree.children[0] as Element).tagName).toBe('h1');
        expect((tree.children[1] as Element).tagName).toBe('img');
        expect((tree.children[2] as Element).tagName).toBe('ul');
    });
});
