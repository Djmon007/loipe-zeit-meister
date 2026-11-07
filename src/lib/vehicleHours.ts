export function parseVehicleHours(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;

  const reading = Number(normalized);
  return Number.isFinite(reading) && reading >= 0 ? reading : null;
}

export function isVehicleHoursNondecreasing(previous: number | null, next: number): boolean {
  return previous === null || next >= previous;
}