import type { AuthUserId } from '../domain/user.entity';
import type { AuthUserQueries } from '../domain/auth-user.queries';
import type { AuthUserDto } from './auth.dto';
import { AuthenticationFailedError } from '../domain/authentication-failed.error';

export class GetCurrentUserUseCase {
  constructor(private readonly users: AuthUserQueries) {}

  async execute(userId: AuthUserId): Promise<AuthUserDto> {
    const user = await this.users.findAuthUserById(userId);
    if (user === null) {
      throw new AuthenticationFailedError();
    }
    return user;
  }
}
