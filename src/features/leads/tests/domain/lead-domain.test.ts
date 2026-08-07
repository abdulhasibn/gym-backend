import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { LeadDeletedError } from '../../domain/lead-deleted.error';
import { Lead } from '../../domain/lead.entity';
import { toLeadId } from '../../domain/lead-id';
import { LeadName } from '../../domain/lead-name.value-object';
import { LeadPhone } from '../../domain/lead-phone.value-object';
import { isOpenLeadStatus } from '../../domain/lead-status';

const now = new Date('2026-08-07T00:00:00.000Z');

function createLead(overrides: Partial<{ phone: string; name: string }> = {}): Lead {
  return Lead.create({
    id: toLeadId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    gymOrgId: toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    name: LeadName.create(overrides.name ?? 'Walk-in'),
    phone: LeadPhone.create(overrides.phone ?? '9876543210'),
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
    expect(isOpenLeadStatus(lead.status)).toBe(true);
  });

  it('rejects empty phone and name', () => {
    expect(() => LeadPhone.create('  ')).toThrow('Lead phone cannot be empty');
    expect(() => LeadName.create('')).toThrow('Lead name cannot be empty');
  });

  it('updates profile and follow-up date', () => {
    const lead = createLead();
    lead.updateProfile(
      {
        name: LeadName.create('Renamed'),
        phone: LeadPhone.create('9000000000'),
        source: null,
        interest: 'trial',
        notes: 'call back',
        followUpDate: '2026-08-10',
      },
      new Date('2026-08-07T01:00:00.000Z'),
    );
    expect(lead.name.value).toBe('Renamed');
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

  it('soft-deletes once and blocks further mutation', () => {
    const lead = createLead();
    lead.softDelete(now);
    expect(lead.isDeleted).toBe(true);
    expect(() => lead.changeStatus('TRIAL', now)).toThrow(LeadDeletedError);
  });
});
