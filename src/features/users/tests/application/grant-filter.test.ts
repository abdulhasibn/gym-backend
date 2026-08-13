import { describe, expect, it } from 'vitest';

import { toUserId } from '../../../../domain/shared/user-id';
import {
  filterProfileByGrants,
  hasProgressGrant,
} from '../../application/filter-profile-by-grants';
import type { ClientProfileSummary } from '../../domain/client-profile.queries';

const summary: ClientProfileSummary = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  heightCm: 170,
  weightKg: 68,
  dob: '1990-01-01',
  gender: 'MALE',
  medicalNotes: 'secret',
  bmi: 23.5,
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
};

describe('filterProfileByGrants', () => {
  it('returns only granted attributes and BMI when height+weight granted', () => {
    const filtered = filterProfileByGrants(summary, {
      profileAttributes: ['HEIGHT', 'WEIGHT', 'DOB'],
      classGrants: [],
    });
    expect(filtered.heightCm).toBe(170);
    expect(filtered.weightKg).toBe(68);
    expect(filtered.dob).toBe('1990-01-01');
    expect(filtered.gender).toBeNull();
    expect(filtered.medicalNotes).toBeNull();
    expect(filtered.bmi).toBe(23.5);
  });

  it('omits BMI when only height granted', () => {
    const filtered = filterProfileByGrants(summary, {
      profileAttributes: ['HEIGHT'],
      classGrants: ['PROGRESS'],
    });
    expect(filtered.bmi).toBeNull();
    expect(filtered.weightKg).toBeNull();
  });
});

describe('hasProgressGrant', () => {
  it('detects PROGRESS class grant', () => {
    expect(hasProgressGrant({ profileAttributes: [], classGrants: ['PROGRESS'] })).toBe(true);
    expect(hasProgressGrant({ profileAttributes: [], classGrants: [] })).toBe(false);
  });
});
