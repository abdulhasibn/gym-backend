import type { AccountLaneValue } from '../../../domain/shared/account-lane-value';
import type { RoleCode } from '../../../domain/shared/role-code';
import type { UserId } from '../../../domain/shared/user-id';
import type { StaffCode } from './staff-code.value-object';

export interface StaffUserRef {
  readonly userId: UserId;
  readonly roleCode: RoleCode;
  readonly lane: AccountLaneValue;
}

/** Invariant-preserving lookup for invite issuance (not a query interface). */
export interface StaffUserLookup {
  findLiveByStaffCode(staffCode: StaffCode): Promise<StaffUserRef | null>;
}
