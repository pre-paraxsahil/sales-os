/**
 * Common input validation and safety helpers for API endpoints.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4 / standard UUID format
 */
export function isValidUuid(id: any): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Safely sanitizes string inputs to prevent empty strings or oversized payloads
 */
export function sanitizeString(val: any, maxLength: number = 2000): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.length > maxLength) {
    return str.slice(0, maxLength);
  }
  return str;
}

/**
 * Parses and bounds integer values with fallback
 */
export function parseSafeInt(
  val: any,
  fallback: number = 0,
  min: number = 0,
  max: number = 10000
): number {
  if (val === null || val === undefined) return fallback;
  const num = parseInt(String(val), 10);
  if (isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}
