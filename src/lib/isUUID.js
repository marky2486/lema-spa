
export function isUUID(value) {
  if (typeof value !== 'string') return false;
  // Standard UUID regex (handles all versions, 8-4-4-4-12 hex chars)
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(value);
}
