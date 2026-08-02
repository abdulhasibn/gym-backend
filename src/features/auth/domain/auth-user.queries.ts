import type { AccountLaneValue } from '../../../domain/shared/account-lane-value';
import type { RoleCode } from '../../../domain/shared/role-code';
import type { AuthUserId } from './user.entity';

export interface AuthUserView {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly lane: AccountLaneValue;
  readonly roleCode: RoleCode;
  readonly staffCode: string | null;
  readonly emailVerifiedAt: string | null;
}

export interface AuthUserQueries {
  findAuthUserById(id: AuthUserId): Promise<AuthUserView | null>;
}
