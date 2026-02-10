export function isIsoString(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

export function parsePage(value: unknown, fallback: number) {
  const parsed = Number(value ?? fallback);
  return parsed;
}

export function isPositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
