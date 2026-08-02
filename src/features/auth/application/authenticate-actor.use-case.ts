import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { AuthProvider } from '../domain/auth-provider.port';
import type { AuthUserQueries } from '../domain/auth-user.queries';
import { AuthenticationFailedError } from '../domain/authentication-failed.error';

export class AuthenticateActorUseCase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly users: AuthUserQueries,
  ) {}

  async execute(accessToken: string): Promise<AuthenticatedActor> {
    const identity = await this.authProvider.getUserFromAccessToken(accessToken);
    const user = await this.users.findAuthUserById(identity.userId);

    if (user === null) {
      throw new AuthenticationFailedError();
    }

    return {
      userId: identity.userId,
      roleCode: user.roleCode,
      lane: user.lane,
      email: user.email,
      staffCode: user.staffCode,
    };
  }
}
