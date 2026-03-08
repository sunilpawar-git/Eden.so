/**
 * Test-only utilities for useEscapeLayer.
 * Re-exports internal inspection/reset functions.
 * NOT for production use — import only from test files.
 */
export { _resetEscapeLayer, _getActiveEntryCount, getHighestEscapePriority } from './useEscapeLayer';
