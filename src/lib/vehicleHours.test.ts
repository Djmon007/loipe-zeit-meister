import { describe, expect, it } from 'vitest';
import { isVehicleHoursNondecreasing, parseVehicleHours } from './vehicleHours';

describe('parseVehicleHours', () => {
  it('accepts the displayed machine reading 1042.2', () => {
    expect(parseVehicleHours('1042.2')).toBe(1042.2);
  });

  it('accepts zero and decimal-comma input', () => {
    expect(parseVehicleHours('0')).toBe(0);
    expect(parseVehicleHours('1042,2')).toBe(1042.2);
  });

  it('rejects empty, malformed, and negative readings', () => {
    expect(parseVehicleHours('')).toBeNull();
    expect(parseVehicleHours('12abc')).toBeNull();
    expect(parseVehicleHours('-1')).toBeNull();
  });

  it('does not allow a machine reading below the previous cumulative reading', () => {
    expect(isVehicleHoursNondecreasing(1042.2, 1042.2)).toBe(true);
    expect(isVehicleHoursNondecreasing(1042.2, 1042.3)).toBe(true);
    expect(isVehicleHoursNondecreasing(1042.2, 1042.1)).toBe(false);
  });
});