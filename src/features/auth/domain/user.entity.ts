import type { RoleCode } from '../../../domain/shared/role-code';
import { toUserId, type UserId } from '../../../domain/shared/user-id';
import { AccountLane } from './account-lane.value-object';
import { AuthUserInvariantError } from './auth-user-invariant.error';
import { EmailAddress } from './email-address.value-object';

export type AuthUserId = UserId;

export function toAuthUserId(value: string): AuthUserId {
  return toUserId(value);
}

export type AuthRoleCode = RoleCode;

export interface AuthUserData {
  readonly id: AuthUserId;
  readonly roleCode: AuthRoleCode;
  readonly lane: AccountLane;
  readonly name: string;
  readonly email: EmailAddress;
  readonly emailVerifiedAt: Date | null;
  readonly googleId: string | null;
  readonly staffCode: string | null;
}

export class AuthUser {
  private constructor(private readonly data: AuthUserData) {}

  static create(data: AuthUserData): AuthUser {
    AuthUser.assertValid(data);
    return new AuthUser(data);
  }

  static reconstitute(data: AuthUserData): AuthUser {
    AuthUser.assertValid(data);
    return new AuthUser(data);
  }

  private static assertValid(data: AuthUserData): void {
    if (data.name.trim().length === 0) {
      throw new AuthUserInvariantError('Auth user name cannot be empty');
    }
    if (data.lane.value === 'CLIENT' && data.roleCode !== 'CLIENT') {
      throw new AuthUserInvariantError('CLIENT accounts must have the CLIENT role');
    }
    if (data.lane.value === 'STAFF' && data.roleCode === 'CLIENT') {
      throw new AuthUserInvariantError('STAFF accounts cannot have the CLIENT role');
    }
    if (data.lane.value === 'CLIENT' && data.staffCode !== null) {
      throw new AuthUserInvariantError('CLIENT accounts cannot have a staff code');
    }
    if (data.lane.value === 'STAFF' && (data.staffCode === null || data.staffCode.trim() === '')) {
      throw new AuthUserInvariantError('STAFF accounts require a staff code');
    }
  }

  get id(): AuthUserId {
    return this.data.id;
  }

  get roleCode(): AuthRoleCode {
    return this.data.roleCode;
  }

  get lane(): AccountLane {
    return this.data.lane;
  }

  get name(): string {
    return this.data.name;
  }

  get email(): string {
    return this.data.email.value;
  }

  get emailVerifiedAt(): Date | null {
    return this.data.emailVerifiedAt;
  }

  get googleId(): string | null {
    return this.data.googleId;
  }

  get staffCode(): string | null {
    return this.data.staffCode;
  }

  withGoogleId(googleId: string): AuthUser {
    if (this.data.googleId !== null && this.data.googleId !== googleId) {
      throw new AuthUserInvariantError('A different Google identity is already linked to this account');
    }

    return new AuthUser({ ...this.data, googleId });
  }
}
