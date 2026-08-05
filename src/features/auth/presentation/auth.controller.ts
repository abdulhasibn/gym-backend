import type { RequestHandler } from 'express';

import type { CompleteGoogleAuthUseCase } from '../application/complete-google-auth.use-case';
import type { GetCurrentUserUseCase } from '../application/get-current-user.use-case';
import type { RefreshSessionUseCase } from '../application/refresh-session.use-case';
import type { RequestEmailOtpUseCase } from '../application/request-email-otp.use-case';
import type { VerifyEmailOtpUseCase } from '../application/verify-email-otp.use-case';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import { requireAuthenticatedIdentity } from './authenticate.middleware';
import {
  completeGoogleSchema,
  refreshSessionSchema,
  requestEmailOtpSchema,
  verifyEmailOtpSchema,
} from './auth.schemas';

export class AuthController {
  constructor(
    private readonly requestEmailOtp: RequestEmailOtpUseCase,
    private readonly verifyEmailOtp: VerifyEmailOtpUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly completeGoogleAuth: CompleteGoogleAuthUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  requestOtp: RequestHandler = async (req, res, next) => {
    try {
      const input = requestEmailOtpSchema.parse(req.body);
      const result = await this.requestEmailOtp.execute(input.email);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyOtp: RequestHandler = async (req, res, next) => {
    try {
      const input = verifyEmailOtpSchema.parse(req.body);
      const result = await this.verifyEmailOtp.execute(input);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  refresh: RequestHandler = async (req, res, next) => {
    try {
      const input = refreshSessionSchema.parse(req.body);
      const result = await this.refreshSession.execute(input.refreshToken);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  completeGoogle: RequestHandler = async (req, res, next) => {
    try {
      const input = completeGoogleSchema.parse(req.body);
      const user = await this.completeGoogleAuth.execute({
        identity: requireAuthenticatedIdentity(req),
        lane: input.lane,
        name: input.name ?? null,
      });
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  };

  me: RequestHandler = async (req, res, next) => {
    try {
      const actor = requireAuthenticatedActor(req);
      const user = await this.getCurrentUser.execute(actor.userId);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  };
}
