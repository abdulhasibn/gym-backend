import type { AccountLane } from './account-lane.value-object';
import type { EmailAddress } from './email-address.value-object';
import type { AuthUser, AuthUserId } from './user.entity';

export interface CreateAuthUser {
  readonly id: AuthUserId;
  readonly lane: AccountLane;
  readonly name: string;
  readonly email: EmailAddress;
  readonly emailVerifiedAt: Date;
  readonly googleId: string | null;
  readonly staffCode: string | null;
}

export interface AuthUserRepository {
  findById(id: AuthUserId): Promise<AuthUser | null>;
  create(user: CreateAuthUser): Promise<AuthUser>;
  linkGoogleIdentity(id: AuthUserId, googleId: string): Promise<void>;
}
