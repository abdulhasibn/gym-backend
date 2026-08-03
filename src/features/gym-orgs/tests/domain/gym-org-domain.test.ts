import { describe, expect, it } from 'vitest';

import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';

describe('Gym organization value objects', () => {
  it('normalizes a gym organization name', () => {
    expect(GymOrgName.create('  North Star Fitness  ').value).toBe('North Star Fitness');
  });

  it('rejects blank and oversized gym organization names', () => {
    expect(() => GymOrgName.create('   ')).toThrow('cannot be empty');
    expect(() => GymOrgName.create('a'.repeat(256))).toThrow('cannot exceed 255 characters');
  });

  it('accepts IANA timezones and rejects invalid values', () => {
    expect(IanaTimezone.create('Asia/Kolkata').value).toBe('Asia/Kolkata');
    expect(() => IanaTimezone.create('India/Delhi')).toThrow('valid IANA timezone');
  });
});
