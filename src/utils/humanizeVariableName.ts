export function humanizeVariableName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const words = trimmed.replace(/_/g, ' ').toLowerCase().split(/\s+/);
  const [first, ...rest] = words;

  if (!first) {
    return '';
  }

  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ');
}
