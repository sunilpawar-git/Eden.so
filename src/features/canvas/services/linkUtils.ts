/**
 * linkUtils — Shared constants for link validation across the editor
 * Centralizes protocol whitelisting to prevent duplicated regex patterns
 */

/** Protocols allowed for links in markdown output and user input */
export const SAFE_LINK_PROTOCOLS = /^(https?:|mailto:)/i;

/** Protocols allowed for links entered via user prompt (strict: http/https only) */
export const SAFE_LINK_URL_START = /^https?:\/\//i;
