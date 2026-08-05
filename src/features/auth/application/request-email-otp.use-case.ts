import type { AuthProvider } from '../domain/auth-provider.port';
import type { EmailAddress } from '../domain/email-address.value-object';
import type { AuthUserRepository } from '../domain/user.repository';
import type { RequestEmailOtpResultDto } from './auth.dto';

export class RequestEmailOtpUseCase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly users: AuthUserRepository,
  ) {}

  async execute(email: EmailAddress): Promise<RequestEmailOtpResultDto> {
    const exists = await this.users.existsByEmail(email);
    await this.authProvider.requestEmailOtp(email);
    return { status: 'OTP_SENT', isNewUser: !exists };
  }
}
