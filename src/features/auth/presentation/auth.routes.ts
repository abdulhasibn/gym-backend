import { Router, type RequestHandler } from 'express';

import { OAuthConfigurationError } from '../application/auth.errors';
import type { AuthController } from './auth.controller';
import { GOOGLE_OAUTH_CALLBACK_HTML } from './google-oauth-callback.page';

export interface GoogleOAuthRouteConfig {
  readonly supabaseUrl: string;
  readonly enableCallbackHelper?: boolean;
}

export function createAuthRouter(
  controller: AuthController,
  authenticateIdentity: RequestHandler,
  authenticate: RequestHandler,
  googleOAuth?: GoogleOAuthRouteConfig,
): Router {
  const router = Router();

  router.post('/otp/request', controller.requestOtp);
  router.post('/otp/verify', controller.verifyOtp);
  router.post('/google/complete', authenticateIdentity, controller.completeGoogle);
  router.get('/me', authenticate, controller.me);

  if (googleOAuth !== undefined) {
    router.get('/google/start', (req, res, next) => {
      if (googleOAuth.enableCallbackHelper === false) {
        next(new OAuthConfigurationError());
        return;
      }

      const host = req.get('host');
      if (host === undefined || host.trim() === '') {
        next(new OAuthConfigurationError());
        return;
      }
      const redirectTo = `${req.protocol}://${host}/auth/google/callback`;
      const authorizeUrl = new URL('/auth/v1/authorize', googleOAuth.supabaseUrl);
      authorizeUrl.searchParams.set('provider', 'google');
      authorizeUrl.searchParams.set('redirect_to', redirectTo);
      res.redirect(302, authorizeUrl.toString());
    });

    if (googleOAuth.enableCallbackHelper !== false) {
      router.get('/google/callback', (_req, res) => {
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        );
        res.status(200).type('html').send(GOOGLE_OAUTH_CALLBACK_HTML);
      });
    }
  }

  return router;
}
