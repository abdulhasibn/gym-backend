import type { AuthSession } from '../domain/auth-provider.port';
import type { AuthUserView } from '../domain/auth-user.queries';
import type { AuthUser } from '../domain/user.entity';

export type AuthUserDto = AuthUserView;

export interface AuthSessionDto {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface RequestEmailOtpResultDto {
  readonly status: 'OTP_SENT';
  /** False when a live app user already exists for this email — client can skip lane. */
  readonly isNewUser: boolean;
}

export interface VerifyOtpResultDto {
  readonly session: AuthSessionDto;
  readonly user: AuthUserDto;
}

export function toAuthUserDto(user: AuthUser): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    lane: user.lane.value,
    roleCode: user.roleCode,
    staffCode: user.staffCode,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  };
}

export function toAuthSessionDto(session: AuthSession): AuthSessionDto {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
  };
}
