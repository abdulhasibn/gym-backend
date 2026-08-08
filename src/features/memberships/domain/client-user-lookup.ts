import type { AccountLaneValue } from '../../../domain/shared/account-lane-value';
import type { RoleCode } from '../../../domain/shared/role-code';
import type { UserId } from '../../../domain/shared/user-id';
import type { InviteeEmail } from './invitee-email.value-object';

export interface ClientUserRef {
  readonly userId: UserId;
  readonly roleCode: RoleCode;
  readonly lane: AccountLaneValue;
}

/** Invariant-preserving lookup for invite issuance (not a query interface). */
export interface ClientUserLookup {
  findLiveByEmail(email: InviteeEmail): Promise<ClientUserRef | null>;
}
