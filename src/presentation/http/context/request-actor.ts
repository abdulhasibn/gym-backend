import type { Request } from 'express';

import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { AuthenticationRequiredError } from '../../../domain/errors/authentication-required.error';

interface AuthenticatedRequest extends Request {
  actor?: AuthenticatedActor;
}

export function setAuthenticatedActor(req: Request, actor: AuthenticatedActor): void {
  (req as AuthenticatedRequest).actor = actor;
}

export function requireAuthenticatedActor(req: Request): AuthenticatedActor {
  const actor = (req as AuthenticatedRequest).actor;
  if (actor === undefined) {
    throw new AuthenticationRequiredError();
  }
  return actor;
}
