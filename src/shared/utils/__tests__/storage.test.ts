/**
 * Storage Utility Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getStorageItem,
    getValidatedStorageItem,
    setStorageItem,
    getStorageJson,
    setStorageJson,
} from '../storage';

describe('Storage Utilities', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('getStorageItem', () => {
        it('should return default value when key is missing', () => {
            expect(getStorageItem('missing-key', 'default')).toBe('default');
        });

        it('should return stored string value', () => {
            localStorage.setItem('test-key', 'hello');
            expect(getStorageItem('test-key', 'default')).toBe('hello');
        });

        it('should parse boolean values correctly', () => {
            localStorage.setItem('bool-true', 'true');
            localStorage.setItem('bool-false', 'false');
            expect(getStorageItem('bool-true', false)).toBe(true);
            expect(getStorageItem('bool-false', true)).toBe(false);
        });

        it('should parse number values correctly', () => {
            localStorage.setItem('num-key', '42');
            expect(getStorageItem('num-key', 0)).toBe(42);
        });

        it('should return default for invalid number', () => {
            localStorage.setItem('bad-num', 'not-a-number');
            expect(getStorageItem('bad-num', 10)).toBe(10);
        });

        it('should return default when localStorage throws', () => {
            const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage unavailable');
            });
            expect(getStorageItem('any-key', 'fallback')).toBe('fallback');
            spy.mockRestore();
        });
    });

    describe('getValidatedStorageItem', () => {
        const validOptions = ['alpha', 'beta', 'gamma'] as const;

        it('should return default when key is missing', () => {
            expect(getValidatedStorageItem('missing', 'alpha', validOptions)).toBe('alpha');
        });

        it('should return stored value when it is in the allow-list', () => {
            localStorage.setItem('valid-key', 'beta');
            expect(getValidatedStorageItem('valid-key', 'alpha', validOptions)).toBe('beta');
        });

        it('should return default when stored value is not in the allow-list', () => {
            localStorage.setItem('invalid-key', 'invalid');
            expect(getValidatedStorageItem('invalid-key', 'alpha', validOptions)).toBe('alpha');
        });

        it('should return default for empty string not in allow-list', () => {
            localStorage.setItem('empty-key', '');
            expect(getValidatedStorageItem('empty-key', 'alpha', validOptions)).toBe('alpha');
        });

        it('should return default when localStorage throws', () => {
            const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage unavailable');
            });
            expect(getValidatedStorageItem('any', 'alpha', validOptions)).toBe('alpha');
            spy.mockRestore();
        });

        it('should reject XSS payloads not in allow-list', () => {
            localStorage.setItem('xss-key', '<script>alert(1)</script>');
            expect(getValidatedStorageItem('xss-key', 'alpha', validOptions)).toBe('alpha');
        });
    });

    describe('setStorageItem', () => {
        it('should write string to localStorage', () => {
            setStorageItem('str-key', 'value');
            expect(localStorage.getItem('str-key')).toBe('value');
        });

        it('should write boolean to localStorage', () => {
            setStorageItem('bool-key', true);
            expect(localStorage.getItem('bool-key')).toBe('true');
        });

        it('should write number to localStorage', () => {
            setStorageItem('num-key', 99);
            expect(localStorage.getItem('num-key')).toBe('99');
        });

        it('should not throw when localStorage is unavailable', () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Quota exceeded');
            });
            expect(() => setStorageItem('key', 'val')).not.toThrow();
            spy.mockRestore();
        });
    });

    describe('getStorageJson', () => {
        it('should return default when key is missing', () => {
            expect(getStorageJson('missing', { a: 1 })).toEqual({ a: 1 });
        });

        it('should parse stored JSON object', () => {
            localStorage.setItem('json-key', JSON.stringify({ name: 'test' }));
            expect(getStorageJson('json-key', {})).toEqual({ name: 'test' });
        });

        it('should parse stored JSON array', () => {
            localStorage.setItem('arr-key', JSON.stringify([1, 2, 3]));
            expect(getStorageJson('arr-key', [])).toEqual([1, 2, 3]);
        });

        it('should return default for invalid JSON', () => {
            localStorage.setItem('bad-json', 'not-json{');
            expect(getStorageJson('bad-json', { fallback: true })).toEqual({ fallback: true });
        });

        it('should return default when localStorage throws', () => {
            const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage unavailable');
            });
            expect(getStorageJson('any', [])).toEqual([]);
            spy.mockRestore();
        });
    });

    describe('setStorageJson', () => {
        it('should serialize and store object', () => {
            setStorageJson('obj-key', { x: 1, y: 2 });
            expect(JSON.parse(localStorage.getItem('obj-key')!)).toEqual({ x: 1, y: 2 });
        });

        it('should serialize and store array', () => {
            setStorageJson('arr-key', [10, 20]);
            expect(JSON.parse(localStorage.getItem('arr-key')!)).toEqual([10, 20]);
        });

        it('should not throw when localStorage is unavailable', () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Quota exceeded');
            });
            expect(() => setStorageJson('key', { data: true })).not.toThrow();
            spy.mockRestore();
        });
    });
});
