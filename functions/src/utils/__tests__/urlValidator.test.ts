/**
 * URL Validator Tests
 * TDD: Validates URL format checks, SSRF protection, and DNS resolution
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validateUrlFormat,
    validateUrlWithDns,
    ipToInt,
    isBlockedIPv4,
    isBlockedIPv6,
} from '../urlValidator.js';

describe('urlValidator', () => {
    describe('ipToInt', () => {
        it('converts 0.0.0.0 to 0', () => {
            expect(ipToInt('0.0.0.0')).toBe(0);
        });

        it('converts 255.255.255.255 to max uint32', () => {
            expect(ipToInt('255.255.255.255')).toBe(4294967295);
        });

        it('converts 10.0.0.1 correctly', () => {
            expect(ipToInt('10.0.0.1')).toBe(167772161);
        });

        it('returns 0 for invalid format', () => {
            expect(ipToInt('not-an-ip')).toBe(0);
        });
    });

    describe('isBlockedIPv4', () => {
        it('blocks 10.x.x.x range', () => {
            expect(isBlockedIPv4(ipToInt('10.0.0.1'))).toBe(true);
            expect(isBlockedIPv4(ipToInt('10.255.255.254'))).toBe(true);
        });

        it('blocks 172.16-31.x.x range', () => {
            expect(isBlockedIPv4(ipToInt('172.16.0.1'))).toBe(true);
            expect(isBlockedIPv4(ipToInt('172.31.255.254'))).toBe(true);
        });

        it('allows 172.32.x.x (outside private range)', () => {
            expect(isBlockedIPv4(ipToInt('172.32.0.1'))).toBe(false);
        });

        it('blocks 192.168.x.x range', () => {
            expect(isBlockedIPv4(ipToInt('192.168.0.1'))).toBe(true);
            expect(isBlockedIPv4(ipToInt('192.168.255.254'))).toBe(true);
        });

        it('blocks loopback 127.x.x.x', () => {
            expect(isBlockedIPv4(ipToInt('127.0.0.1'))).toBe(true);
            expect(isBlockedIPv4(ipToInt('127.255.255.255'))).toBe(true);
        });

        it('blocks link-local 169.254.x.x', () => {
            expect(isBlockedIPv4(ipToInt('169.254.0.1'))).toBe(true);
        });

        it('blocks CGNAT 100.64.x.x range', () => {
            expect(isBlockedIPv4(ipToInt('100.64.0.1'))).toBe(true);
            expect(isBlockedIPv4(ipToInt('100.127.255.255'))).toBe(true);
        });

        it('allows public IPs', () => {
            expect(isBlockedIPv4(ipToInt('8.8.8.8'))).toBe(false);
            expect(isBlockedIPv4(ipToInt('93.184.216.34'))).toBe(false);
            expect(isBlockedIPv4(ipToInt('1.1.1.1'))).toBe(false);
        });
    });

    describe('isBlockedIPv6', () => {
        it('blocks loopback ::1', () => {
            expect(isBlockedIPv6('::1')).toBe(true);
        });

        it('blocks link-local fe80:', () => {
            expect(isBlockedIPv6('fe80::1')).toBe(true);
        });

        it('blocks unique local fc00: and fd00:', () => {
            expect(isBlockedIPv6('fc00::1')).toBe(true);
            expect(isBlockedIPv6('fd00::abcd')).toBe(true);
        });

        it('allows public IPv6 addresses', () => {
            expect(isBlockedIPv6('2001:db8::1')).toBe(false);
            expect(isBlockedIPv6('2607:f8b0:4004:800::200e')).toBe(false);
        });
    });

    describe('validateUrlFormat', () => {
        it('accepts valid https URL', () => {
            const result = validateUrlFormat('https://example.com');
            expect(result.valid).toBe(true);
        });

        it('accepts valid http URL', () => {
            const result = validateUrlFormat('http://example.com/path?q=1');
            expect(result.valid).toBe(true);
        });

        it('rejects empty string', () => {
            const result = validateUrlFormat('');
            expect(result.valid).toBe(false);
        });

        it('rejects non-string input', () => {
            const result = validateUrlFormat(null as unknown as string);
            expect(result.valid).toBe(false);
        });

        it('rejects ftp:// scheme', () => {
            const result = validateUrlFormat('ftp://example.com');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('HTTP and HTTPS');
        });

        it('rejects javascript: scheme', () => {
            const result = validateUrlFormat('javascript:alert(1)');
            expect(result.valid).toBe(false);
        });

        it('rejects data: URIs', () => {
            const result = validateUrlFormat('data:text/html,<h1>test</h1>');
            expect(result.valid).toBe(false);
        });

        it('rejects file: scheme', () => {
            const result = validateUrlFormat('file:///etc/passwd');
            expect(result.valid).toBe(false);
        });

        it('rejects URLs exceeding max length', () => {
            const longUrl = 'https://example.com/' + 'a'.repeat(2100);
            const result = validateUrlFormat(longUrl);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('maximum length');
        });

        it('rejects malformed URLs', () => {
            const result = validateUrlFormat('not-a-valid-url');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateUrlWithDns', () => {
        beforeEach(() => {
            vi.restoreAllMocks();
        });

        it('rejects URLs with private IPv4 as hostname', async () => {
            const result = await validateUrlWithDns('http://192.168.1.1/admin');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not allowed');
        });

        it('rejects URLs with loopback IP', async () => {
            const result = await validateUrlWithDns('http://127.0.0.1:8080');
            expect(result.valid).toBe(false);
        });

        it('rejects invalid URL format before DNS', async () => {
            const result = await validateUrlWithDns('ftp://bad.com');
            expect(result.valid).toBe(false);
        });

        it('accepts URLs with raw public IPv4', async () => {
            const result = await validateUrlWithDns('https://8.8.8.8');
            expect(result.valid).toBe(true);
        });
    });
});
