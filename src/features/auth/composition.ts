import { randomUUID } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';
import { CompleteGoogleAuthUseCase } from './application/complete-google-auth.use-case';
import { AuthenticateActorUseCase } from './application/authenticate-actor.use-case';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case';
import { ProvisionAuthUserUseCase } from './application/provision-auth-user.use-case';
import { RequestEmailOtpUseCase } from './application/request-email-otp.use-case';
import { VerifyEmailOtpUseCase } from './application/verify-email-otp.use-case';
import { SupabaseAuthProvider } from '../../infrastructure/auth/supabase-auth.provider';
import type { Database } from '../../infrastructure/supabase/database.types';
import {
  createAuthenticateIdentityMiddleware,
  createAuthenticateMiddleware,
} from './presentation/authenticate.middleware';
import { SupabaseAuthUserRepository } from './infrastructure/supabase-auth-user.repository';
import { SupabaseAuthUserQueries } from './infrastructure/supabase-auth-user.queries';
import { AuthController } from './presentation/auth.controller';
import { mapAuthError } from './presentation/auth.error-mapper';
import { createAuthRouter } from './presentation/auth.routes';

export function composeAuthFeature(
  authClient: SupabaseClient<Database>,
  dataClient: SupabaseClient<Database>,
  options: {
    readonly supabaseUrl: string;
    readonly enableGoogleCallbackHelper: boolean;
  },
) {
  const authProvider = new SupabaseAuthProvider(authClient);
  const users = new SupabaseAuthUserRepository(dataClient);
  const userQueries = new SupabaseAuthUserQueries(dataClient);
  const provisionUser = new ProvisionAuthUserUseCase(users, {
    generate: () => `STF-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
  });
  const controller = new AuthController(
    new RequestEmailOtpUseCase(authProvider),
    new VerifyEmailOtpUseCase(authProvider, provisionUser),
    new CompleteGoogleAuthUseCase(provisionUser),
    new GetCurrentUserUseCase(userQueries),
  );

  return {
    router: createAuthRouter(
      controller,
      createAuthenticateIdentityMiddleware(authProvider),
      createAuthenticateMiddleware(new AuthenticateActorUseCase(authProvider, userQueries)),
      {
        supabaseUrl: options.supabaseUrl,
        enableCallbackHelper: options.enableGoogleCallbackHelper,
      },
    ),
    errorMapper: mapAuthError,
  };
}
