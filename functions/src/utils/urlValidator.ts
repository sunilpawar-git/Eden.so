/**
 * URL Validator - Validates and sanitizes URLs for safe server-side fetching
 * Provides SSRF protection by blocking private/reserved IP ranges
 */
import {
    ALLOWED_SCHEMES,
    MAX_URL_LENGTH,
    errorMessages,
} from './securityConstants.js';
import { resolve4, resolve6 } from 'dns/promises';

/** Result of URL validation */
export interface UrlValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * RFC 1918 and reserved IPv4 ranges that must be blocked (SSRF protection).
 * Each entry is [startIp, endIp] as 32-bit integers.
 */
const BLOCKED_IPV4_RANGES: Array<[number, number]> = [
    [ipToInt('10.0.0.0'), ipToInt('10.255.255.255')],       // 10.0.0.0/8
    [ipToInt('172.16.0.0'), ipToInt('172.31.255.255')],      // 172.16.0.0/12
    [ipToInt('192.168.0.0'), ipToInt('192.168.255.255')],    // 192.168.0.0/16
    [ipToInt('127.0.0.0'), ipToInt('127.255.255.255')],      // 127.0.0.0/8
    [ipToInt('169.254.0.0'), ipToInt('169.254.255.255')],    // 169.254.0.0/16
    [ipToInt('0.0.0.0'), ipToInt('0.255.255.255')],          // 0.0.0.0/8
    [ipToInt('100.64.0.0'), ipToInt('100.127.255.255')],     // 100.64.0.0/10 (CGNAT)
    [ipToInt('192.0.0.0'), ipToInt('192.0.0.255')],          // 192.0.0.0/24
    [ipToInt('198.18.0.0'), ipToInt('198.19.255.255')],      // 198.18.0.0/15
    [ipToInt('224.0.0.0'), ipToInt('255.255.255.255')],      // multicast + reserved
];

/** Blocked IPv6 prefixes (loopback, link-local, unique local) */
const BLOCKED_IPV6_PREFIXES = ['::1', 'fe80:', 'fc00:', 'fd00:'];

/** Convert dotted IPv4 string to 32-bit integer */
export function ipToInt(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;
    return parts.reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

/** Check if an IPv4 address (as integer) falls in a blocked range */
export function isBlockedIPv4(ipInt: number): boolean {
    return BLOCKED_IPV4_RANGES.some(
        ([start, end]) => ipInt >= start && ipInt <= end,
    );
}

/** Check if an IPv6 address string matches a blocked prefix */
export function isBlockedIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    return BLOCKED_IPV6_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Validate URL format: scheme, length, and parsability.
 * Does NOT perform DNS resolution (use validateUrlWithDns for full check).
 */
export function validateUrlFormat(url: string): UrlValidationResult {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: errorMessages.invalidUrl };
    }

    if (url.length > MAX_URL_LENGTH) {
        return { valid: false, error: errorMessages.urlTooLong };
    }

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { valid: false, error: errorMessages.invalidUrl };
    }

    const scheme = parsed.protocol;
    if (!ALLOWED_SCHEMES.includes(scheme as (typeof ALLOWED_SCHEMES)[number])) {
        return { valid: false, error: errorMessages.unsupportedScheme };
    }

    if (!parsed.hostname) {
        return { valid: false, error: errorMessages.invalidUrl };
    }

    return { valid: true };
}

/**
 * Full URL validation with DNS resolution and SSRF check.
 * Resolves the hostname to IP addresses and blocks private ranges.
 */
export async function validateUrlWithDns(url: string): Promise<UrlValidationResult> {
    const formatResult = validateUrlFormat(url);
    if (!formatResult.valid) return formatResult;

    const hostname = new URL(url).hostname;

    // Check if hostname is a raw IP address
    const ipv4Int = ipToInt(hostname);
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        if (isBlockedIPv4(ipv4Int)) {
            return { valid: false, error: errorMessages.ssrfBlocked };
        }
        return { valid: true };
    }

    if (hostname.startsWith('[') || hostname.includes(':')) {
        if (isBlockedIPv6(hostname.replace(/^\[|\]$/g, ''))) {
            return { valid: false, error: errorMessages.ssrfBlocked };
        }
        return { valid: true };
    }

    // Resolve DNS and check all returned IPs
    try {
        const [ipv4Results, ipv6Results] = await Promise.allSettled([
            resolve4(hostname),
            resolve6(hostname),
        ]);

        const ipv4Addrs = ipv4Results.status === 'fulfilled' ? ipv4Results.value : [];
        const ipv6Addrs = ipv6Results.status === 'fulfilled' ? ipv6Results.value : [];

        if (ipv4Addrs.length === 0 && ipv6Addrs.length === 0) {
            return { valid: false, error: errorMessages.ssrfBlocked };
        }

        for (const ip of ipv4Addrs) {
            if (isBlockedIPv4(ipToInt(ip))) {
                return { valid: false, error: errorMessages.ssrfBlocked };
            }
        }

        for (const ip of ipv6Addrs) {
            if (isBlockedIPv6(ip)) {
                return { valid: false, error: errorMessages.ssrfBlocked };
            }
        }

        return { valid: true };
    } catch {
        return { valid: false, error: errorMessages.ssrfBlocked };
    }
}
