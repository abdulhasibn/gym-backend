/**
 * Cross-cutting operational constants with no business meaning.
 * Feature-specific constants (e.g. plan caps, grant classes) belong in the
 * owning feature's own module, not here.
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export const JSON_BODY_LIMIT = '1mb';
