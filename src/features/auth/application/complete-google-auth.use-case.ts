import type { AccountLane } from '../domain/account-lane.value-object';
import type { AuthenticatedIdentity } from '../domain/auth-provider.port';
import { toAuthUserDto, type AuthUserDto } from './auth.dto';
import { GoogleIdentityRequiredError } from './auth.errors';
import type { ProvisionAuthUserUseCase } from './provision-auth-user.use-case';

export interface CompleteGoogleAuthCommand {
  readonly identity: AuthenticatedIdentity;
  readonly lane: AccountLane;
  readonly name: string | null;
}

export class CompleteGoogleAuthUseCase {
  constructor(private readonly provisionUser: ProvisionAuthUserUseCase) {}

  async execute(command: CompleteGoogleAuthCommand): Promise<AuthUserDto> {
    if (command.identity.googleId === null) {
      throw new GoogleIdentityRequiredError();
    }
    const name =
      command.name ?? command.identity.displayName ?? command.identity.email?.value ?? 'Gym member';
    const user = await this.provisionUser.execute({
      identity: command.identity,
      lane: command.lane,
      name,
    });
    return toAuthUserDto(user);
  }
}
