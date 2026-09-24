export function parseHoursAndMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const totalHours = hours + minutes / 60;

  return totalHours > 0 ? Math.round(totalHours * 100) / 100 : null;
}

export function formatHoursAndMinutes(value: number | null): string {
  if (value === null) return '';

  const totalMinutes = Math.round(Number(value) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}