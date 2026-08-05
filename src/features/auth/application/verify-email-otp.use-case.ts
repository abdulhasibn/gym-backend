import type { AccountLane } from '../domain/account-lane.value-object';
import type { AuthProvider } from '../domain/auth-provider.port';
import type { EmailAddress } from '../domain/email-address.value-object';
import { toAuthSessionDto, toAuthUserDto, type VerifyOtpResultDto } from './auth.dto';
import type { ProvisionAuthUserUseCase } from './provision-auth-user.use-case';

export interface VerifyEmailOtpCommand {
  readonly email: EmailAddress;
  readonly token: string;
  /** Required on first provision; omit on returning sign-ins. */
  readonly lane?: AccountLane;
  readonly name?: string;
}

export class VerifyEmailOtpUseCase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly provisionUser: ProvisionAuthUserUseCase,
  ) {}

  async execute(command: VerifyEmailOtpCommand): Promise<VerifyOtpResultDto> {
    const session = await this.authProvider.verifyEmailOtp(command.email, command.token);
    const user = await this.provisionUser.execute({
      identity: session,
      lane: command.lane,
      name: command.name ?? session.displayName ?? session.email?.value ?? 'Gym member',
    });

    return { session: toAuthSessionDto(session), user: toAuthUserDto(user) };
  }
}
