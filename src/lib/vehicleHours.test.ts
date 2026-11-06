import { describe, expect, it } from 'vitest';
import { parseVehicleHours } from './vehicleHours';

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
});