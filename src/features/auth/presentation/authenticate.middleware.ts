import type { Request, RequestHandler } from 'express';

import { setAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import { measureSpan } from '../../../shared/timing/request-spans';
import type { AuthenticateActorUseCase } from '../application/authenticate-actor.use-case';
import type { AuthProvider, AuthenticatedIdentity } from '../domain/auth-provider.port';
import { AuthenticationFailedError } from '../domain/authentication-failed.error';

interface AuthenticatedIdentityRequest extends Request {
  authIdentity?: AuthenticatedIdentity;
}

export function createAuthenticateIdentityMiddleware(authProvider: AuthProvider): RequestHandler {
  return async (req, _res, next) => {
    try {
      const authenticatedRequest = req as AuthenticatedIdentityRequest;
      authenticatedRequest.authIdentity = await measureSpan('auth', () =>
        authProvider.getUserFromAccessToken(getBearerToken(req)),
      );
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createAuthenticateMiddleware(
  authenticateActor: AuthenticateActorUseCase,
): RequestHandler {
  return async (req, _res, next) => {
    try {
      setAuthenticatedActor(
        req,
        await measureSpan('auth', () => authenticateActor.execute(getBearerToken(req))),
      );
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuthenticatedIdentity(req: Request): AuthenticatedIdentity {
  const identity = (req as AuthenticatedIdentityRequest).authIdentity;
  if (identity === undefined) {
    throw new AuthenticationFailedError();
  }
  return identity;
}

function getBearerToken(req: Request): string {
  const authorization = req.get('authorization');
  if (authorization === undefined) {
    throw new AuthenticationFailedError();
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || token === undefined || token.trim() === '') {
    throw new AuthenticationFailedError();
  }
  return token;
}
