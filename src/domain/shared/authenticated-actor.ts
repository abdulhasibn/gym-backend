import type { AccountLaneValue } from './account-lane-value';
import type { RoleCode } from './role-code';
import type { UserId } from './user-id';

export interface AuthenticatedActor {
  readonly userId: UserId;
  readonly roleCode: RoleCode;
  readonly lane: AccountLaneValue;
  readonly email: string;
  readonly staffCode: string | null;
}
