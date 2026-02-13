/**
 * Cloud Functions Entry Point
 * Exports all HTTP functions for Firebase deployment
 */
import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK (must be called before any admin imports)
initializeApp();

export { fetchLinkMeta } from './fetchLinkMeta.js';
export { proxyImage } from './proxyImage.js';
