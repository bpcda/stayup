type LocalizedSource = Record<string, unknown>;

export const pickLocalized = (
  source: LocalizedSource | null | undefined,
  field: string,
  language: string,
): string | null => {
  if (!source) return null;
  const lang = language.slice(0, 2);
  const localized = source[`${field}_${lang}`];
  const fallback = source[field];

  if (typeof localized === "string" && localized.trim()) return localized;
  if (typeof fallback === "string" && fallback.trim()) return fallback;
  return null;
};
