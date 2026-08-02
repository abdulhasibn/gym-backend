import type { AuthProvider } from '../domain/auth-provider.port';
import type { EmailAddress } from '../domain/email-address.value-object';

export class RequestEmailOtpUseCase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(email: EmailAddress): Promise<void> {
    return this.authProvider.requestEmailOtp(email);
  }
}
