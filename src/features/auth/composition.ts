import { randomUUID } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';
import { CompleteGoogleAuthUseCase } from './application/complete-google-auth.use-case';
import { AuthenticateActorUseCase } from './application/authenticate-actor.use-case';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case';
import { ProvisionAuthUserUseCase } from './application/provision-auth-user.use-case';
import { RefreshSessionUseCase } from './application/refresh-session.use-case';
import { RequestEmailOtpUseCase } from './application/request-email-otp.use-case';
import { VerifyEmailOtpUseCase } from './application/verify-email-otp.use-case';
import {
  SupabaseAuthProvider,
  supabaseAuthIssuer,
} from '../../infrastructure/auth/supabase-auth.provider';
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

/** Temporary smoke backdoor for any email — remove when real OTP UX is enough. */
const TEMP_MASTER_EMAIL_OTP = '123456';

export function composeAuthFeature(
  authClient: SupabaseClient<Database>,
  dataClient: SupabaseClient<Database>,
  options: {
    readonly supabaseUrl: string;
    readonly jwtSecret: string | null;
    readonly enableGoogleCallbackHelper: boolean;
  },
) {
  const authProvider = new SupabaseAuthProvider(authClient, {
    jwtSecret: options.jwtSecret,
    issuer: supabaseAuthIssuer(options.supabaseUrl),
    masterEmailOtp: TEMP_MASTER_EMAIL_OTP,
    adminClient: dataClient,
  });
  const users = new SupabaseAuthUserRepository(dataClient);
  const userQueries = new SupabaseAuthUserQueries(dataClient);
  const authenticate = createAuthenticateMiddleware(
    new AuthenticateActorUseCase(authProvider, userQueries),
  );
  const provisionUser = new ProvisionAuthUserUseCase(users, {
    generate: () => `STF-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
  });
  const controller = new AuthController(
    new RequestEmailOtpUseCase(authProvider, users),
    new VerifyEmailOtpUseCase(authProvider, provisionUser),
    new RefreshSessionUseCase(authProvider),
    new CompleteGoogleAuthUseCase(provisionUser),
    new GetCurrentUserUseCase(userQueries),
  );

  return {
    router: createAuthRouter(
      controller,
      createAuthenticateIdentityMiddleware(authProvider),
      authenticate,
      {
        supabaseUrl: options.supabaseUrl,
        enableCallbackHelper: options.enableGoogleCallbackHelper,
      },
    ),
    authenticate,
    errorMapper: mapAuthError,
  };
}
