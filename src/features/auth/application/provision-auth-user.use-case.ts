import type { AccountLane } from '../domain/account-lane.value-object';
import type { AuthenticatedIdentity } from '../domain/auth-provider.port';
import type { AuthUser } from '../domain/user.entity';
import type { AuthUserRepository } from '../domain/user.repository';
import { EmailNotVerifiedError, LaneMismatchError, LaneRequiredError } from './auth.errors';

export interface StaffCodeGenerator {
  generate(): string;
}

export interface ProvisionAuthUserCommand {
  readonly identity: AuthenticatedIdentity;
  /** Required on first provision; optional for returning sign-ins. */
  readonly lane?: AccountLane;
  readonly name: string;
}

export class ProvisionAuthUserUseCase {
  constructor(
    private readonly users: AuthUserRepository,
    private readonly staffCodeGenerator: StaffCodeGenerator,
  ) {}

  async execute(command: ProvisionAuthUserCommand): Promise<AuthUser> {
    const email = command.identity.email;
    const emailVerifiedAt = command.identity.emailVerifiedAt;

    if (email === null || emailVerifiedAt === null) {
      throw new EmailNotVerifiedError();
    }

    const existing = await this.users.findById(command.identity.userId);
    if (existing !== null) {
      if (command.lane !== undefined && !existing.lane.equals(command.lane)) {
        throw new LaneMismatchError();
      }
      if (command.identity.googleId !== null && existing.googleId === null) {
        await this.users.linkGoogleIdentity(existing.id, command.identity.googleId);
      }
      return existing;
    }

    if (command.lane === undefined) {
      throw new LaneRequiredError();
    }

    return this.users.create({
      id: command.identity.userId,
      lane: command.lane,
      name: command.name,
      email,
      emailVerifiedAt,
      googleId: command.identity.googleId,
      staffCode: command.lane.value === 'STAFF' ? this.staffCodeGenerator.generate() : null,
    });
  }
}
