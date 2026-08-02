import type { AuthUserId } from './user.entity';
import type { EmailAddress } from './email-address.value-object';

export interface AuthenticatedIdentity {
  readonly userId: AuthUserId;
  readonly email: EmailAddress | null;
  readonly emailVerifiedAt: Date | null;
  readonly displayName: string | null;
  readonly googleId: string | null;
}

export interface AuthSession extends AuthenticatedIdentity {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface AuthProvider {
  requestEmailOtp(email: EmailAddress): Promise<void>;
  verifyEmailOtp(email: EmailAddress, token: string): Promise<AuthSession>;
  getUserFromAccessToken(accessToken: string): Promise<AuthenticatedIdentity>;
}
