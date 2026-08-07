import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import { LeadDeletedError } from './lead-deleted.error';
import type { LeadId } from './lead-id';
import { LeadName } from './lead-name.value-object';
import { LeadPhone } from './lead-phone.value-object';
import { isLeadStatus, type LeadStatus } from './lead-status';

export interface LeadData {
  readonly id: LeadId;
  readonly gymOrgId: GymOrgId;
  readonly name: LeadName;
  readonly phone: LeadPhone;
  readonly source: string | null;
  readonly status: LeadStatus;
  readonly interest: string | null;
  readonly notes: string | null;
  readonly followUpDate: string | null;
  readonly convertedMembershipInviteId: string | null;
  readonly createdBy: UserId;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateLeadProps {
  readonly id: LeadId;
  readonly gymOrgId: GymOrgId;
  readonly name: LeadName;
  readonly phone: LeadPhone;
  readonly source: string | null;
  readonly interest: string | null;
  readonly notes: string | null;
  readonly createdBy: UserId;
  readonly now: Date;
}

export interface UpdateLeadProfile {
  readonly name: LeadName;
  readonly phone: LeadPhone;
  readonly source: string | null;
  readonly interest: string | null;
  readonly notes: string | null;
  readonly followUpDate: string | null;
}

function assertOptionalText(value: string | null, field: string, max: number): void {
  if (value === null) {
    return;
  }
  if (value.length > max) {
    throw new Error(`${field} cannot exceed ${max} characters`);
  }
}

function assertFollowUpDate(value: string | null): void {
  if (value === null) {
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Follow-up date must be YYYY-MM-DD');
  }
}

function assertLeadData(data: LeadData): void {
  assertOptionalText(data.source, 'Source', 255);
  assertOptionalText(data.interest, 'Interest', 2000);
  assertOptionalText(data.notes, 'Notes', 5000);
  assertFollowUpDate(data.followUpDate);
  if (!isLeadStatus(data.status)) {
    throw new Error('Lead status is invalid');
  }
}

export class Lead {
  private constructor(private data: LeadData) {}

  static create(props: CreateLeadProps): Lead {
    const data: LeadData = {
      id: props.id,
      gymOrgId: props.gymOrgId,
      name: props.name,
      phone: props.phone,
      source: props.source,
      status: 'NEW',
      interest: props.interest,
      notes: props.notes,
      followUpDate: null,
      convertedMembershipInviteId: null,
      createdBy: props.createdBy,
      deletedAt: null,
      createdAt: props.now,
      updatedAt: props.now,
    };
    assertLeadData(data);
    return new Lead(data);
  }

  static reconstitute(data: LeadData): Lead {
    assertLeadData(data);
    return new Lead(data);
  }

  get id(): LeadId {
    return this.data.id;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get name(): LeadName {
    return this.data.name;
  }

  get phone(): LeadPhone {
    return this.data.phone;
  }

  get source(): string | null {
    return this.data.source;
  }

  get status(): LeadStatus {
    return this.data.status;
  }

  get interest(): string | null {
    return this.data.interest;
  }

  get notes(): string | null {
    return this.data.notes;
  }

  get followUpDate(): string | null {
    return this.data.followUpDate;
  }

  get convertedMembershipInviteId(): string | null {
    return this.data.convertedMembershipInviteId;
  }

  get createdBy(): UserId {
    return this.data.createdBy;
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  get isDeleted(): boolean {
    return this.data.deletedAt !== null;
  }

  updateProfile(profile: UpdateLeadProfile, updatedAt: Date): void {
    this.assertNotDeleted();
    const next: LeadData = {
      ...this.data,
      name: profile.name,
      phone: profile.phone,
      source: profile.source,
      interest: profile.interest,
      notes: profile.notes,
      followUpDate: profile.followUpDate,
      updatedAt,
    };
    assertLeadData(next);
    this.data = next;
  }

  changeStatus(status: LeadStatus, updatedAt: Date): void {
    this.assertNotDeleted();
    if (!isLeadStatus(status)) {
      throw new Error('Lead status is invalid');
    }
    this.data = { ...this.data, status, updatedAt };
  }

  softDelete(deletedAt: Date): void {
    this.assertNotDeleted();
    this.data = { ...this.data, deletedAt, updatedAt: deletedAt };
  }

  private assertNotDeleted(): void {
    if (this.data.deletedAt !== null) {
      throw new LeadDeletedError();
    }
  }
}
