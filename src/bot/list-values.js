export function asList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null || typeof value === 'object') {
    return [];
  }
  return [value];
}
