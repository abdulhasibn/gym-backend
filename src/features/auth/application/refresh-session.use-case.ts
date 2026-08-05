import type { AuthProvider } from '../domain/auth-provider.port';
import { toAuthSessionDto, type AuthSessionDto } from './auth.dto';

export interface RefreshSessionResultDto {
  readonly session: AuthSessionDto;
}

export class RefreshSessionUseCase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(refreshToken: string): Promise<RefreshSessionResultDto> {
    const session = await this.authProvider.refreshSession(refreshToken);
    return { session: toAuthSessionDto(session) };
  }
}
