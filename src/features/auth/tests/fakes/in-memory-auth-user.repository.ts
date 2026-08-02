import { AuthUser } from '../../domain/user.entity';
import type { AuthUserRepository, CreateAuthUser } from '../../domain/user.repository';
import type { AuthUserQueries, AuthUserView } from '../../domain/auth-user.queries';
import { roleCodeForLane } from '../../domain/account-lane.value-object';

export class InMemoryAuthUserRepository implements AuthUserRepository, AuthUserQueries {
  private readonly users = new Map<string, AuthUser>();

  async findById(id: AuthUser['id']): Promise<AuthUser | null> {
    return this.users.get(id) ?? null;
  }

  async create(command: CreateAuthUser): Promise<AuthUser> {
    const user = AuthUser.create({
      ...command,
      roleCode: roleCodeForLane(command.lane),
    });
    this.users.set(user.id, user);
    return user;
  }

  async linkGoogleIdentity(id: AuthUser['id'], googleId: string): Promise<void> {
    const user = this.users.get(id);
    if (user === undefined) {
      throw new Error('Cannot link Google identity to an unknown user');
    }
    this.users.set(id, user.withGoogleId(googleId));
  }

  async findAuthUserById(id: AuthUser['id']): Promise<AuthUserView | null> {
    const user = await this.findById(id);
    if (user === null) {
      return null;
    }

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
}
