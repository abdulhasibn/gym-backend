import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { LeadAlreadyConvertedError } from '../../domain/lead-already-converted.error';
import { LeadDeletedError } from '../../domain/lead-deleted.error';
import { LeadEmail } from '../../domain/lead-email.value-object';
import { Lead } from '../../domain/lead.entity';
import { toLeadId } from '../../domain/lead-id';
import { LeadName } from '../../domain/lead-name.value-object';
import { LeadNotConvertibleError } from '../../domain/lead-not-convertible.error';
import { LeadPhone } from '../../domain/lead-phone.value-object';
import { isOpenLeadStatus } from '../../domain/lead-status';

const now = new Date('2026-08-07T00:00:00.000Z');

function createLead(
  overrides: Partial<{ phone: string; name: string; email: string | null }> = {},
): Lead {
  return Lead.create({
    id: toLeadId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    name: LeadName.create(overrides.name ?? 'Walk-in'),
    phone: LeadPhone.create(overrides.phone ?? '9876543210'),
    email:
      overrides.email === undefined || overrides.email === null
        ? null
        : LeadEmail.create(overrides.email),
    source: 'walk-in',
    interest: null,
    notes: null,
    createdBy: toUserId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
    now,
  });
}

describe('Lead domain', () => {
  it('creates leads in NEW status', () => {
    const lead = createLead();
    expect(lead.status).toBe('NEW');
    expect(lead.followUpDate).toBeNull();
    expect(lead.email).toBeNull();
    expect(lead.convertedMembershipInviteId).toBeNull();
    expect(isOpenLeadStatus(lead.status)).toBe(true);
  });

  it('rejects empty phone and name', () => {
    expect(() => LeadPhone.create('  ')).toThrow('Lead phone cannot be empty');
    expect(() => LeadName.create('')).toThrow('Lead name cannot be empty');
  });

  it('rejects invalid lead email', () => {
    expect(() => LeadEmail.create('  ')).toThrow('Lead email is invalid');
    expect(() => LeadEmail.create('not-an-email')).toThrow('Lead email is invalid');
    expect(LeadEmail.create(' Priya@Gym.test ').value).toBe('priya@gym.test');
  });

  it('updates profile and follow-up date', () => {
    const lead = createLead();
    lead.updateProfile(
      {
        name: LeadName.create('Renamed'),
        phone: LeadPhone.create('9000000000'),
        email: LeadEmail.create('renamed@gym.test'),
        source: null,
        interest: 'trial',
        notes: 'call back',
        followUpDate: '2026-08-10',
      },
      new Date('2026-08-07T01:00:00.000Z'),
    );
    expect(lead.name.value).toBe('Renamed');
    expect(lead.email?.value).toBe('renamed@gym.test');
    expect(lead.followUpDate).toBe('2026-08-10');
  });

  it('changes status to any pipeline value', () => {
    const lead = createLead();
    lead.changeStatus('LOST', now);
    expect(lead.status).toBe('LOST');
    expect(isOpenLeadStatus(lead.status)).toBe(false);
    lead.changeStatus('CONTACTED', now);
    expect(lead.status).toBe('CONTACTED');
  });

  it('marks converted with invite id', () => {
    const lead = createLead();
    lead.markConverted('dddddddd-dddd-4ddd-8ddd-dddddddddddd', now);
    expect(lead.status).toBe('CONVERTED');
    expect(lead.convertedMembershipInviteId).toBe('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    expect(() => lead.markConverted('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', now)).toThrow(
      LeadAlreadyConvertedError,
    );
  });

  it('rejects converting a lost lead', () => {
    const lead = createLead();
    lead.changeStatus('LOST', now);
    expect(() => lead.assertCanConvert()).toThrow(LeadNotConvertibleError);
    expect(() => lead.markConverted('dddddddd-dddd-4ddd-8ddd-dddddddddddd', now)).toThrow(
      LeadNotConvertibleError,
    );
  });

  it('records email then converts a CONVERTED lead with no invite yet', () => {
    const lead = createLead();
    lead.changeStatus('CONVERTED', now);
    lead.recordEmail(LeadEmail.create('walkin@gym.test'), now);
    lead.markConverted('dddddddd-dddd-4ddd-8ddd-dddddddddddd', now);
    expect(lead.email?.value).toBe('walkin@gym.test');
    expect(lead.convertedMembershipInviteId).toBe('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  });

  it('soft-deletes once and blocks further mutation', () => {
    const lead = createLead();
    lead.softDelete(now);
    expect(lead.isDeleted).toBe(true);
    expect(() => lead.changeStatus('TRIAL', now)).toThrow(LeadDeletedError);
    expect(() => lead.markConverted('dddddddd-dddd-4ddd-8ddd-dddddddddddd', now)).toThrow(
      LeadDeletedError,
    );
  });
});
