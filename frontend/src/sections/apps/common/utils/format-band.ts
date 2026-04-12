export function roundBand(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value);
}

export function formatRoundedBand(
  value: number | null | undefined,
  fallback = '-'
): string {
  const rounded = roundBand(value);
  return rounded == null ? fallback : String(rounded);
}
