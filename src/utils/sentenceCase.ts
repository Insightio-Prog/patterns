/**
 * "MEAL TYPE" -> "Meal type". Text that already has lowercase letters is left
 * alone, so hand-written labels ("Night sweats", "GP visit") are never altered.
 */
export function sentenceCase(text: string | null | undefined): string {
  const value = String(text ?? '');

  if (!value || /[a-z]/.test(value)) {
    return value;
  }

  const lower = value.toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
