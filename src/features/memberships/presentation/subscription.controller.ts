import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { ListClientSubscriptionsUseCase } from '../application/list-client-subscriptions.use-case';
import type { ListMySubscriptionsUseCase } from '../application/list-my-subscriptions.use-case';
import type { ListRenewalsDueUseCase } from '../application/list-renewals-due.use-case';
import type { OverrideSubscriptionStartUseCase } from '../application/override-subscription-start.use-case';
import type { UpdateSubscriptionPaymentUseCase } from '../application/update-subscription-payment.use-case';
import { toSubscriptionId } from '../domain/subscription-id';
import {
  gymAndClientUserIdParamSchema,
  gymAndSubscriptionIdParamSchema,
  gymOrgIdParamSchema,
  overrideSubscriptionStartSchema,
  renewalsDueQuerySchema,
  updateSubscriptionPaymentSchema,
} from './subscription.schemas';

export class SubscriptionController {
  constructor(
    private readonly listClientSubscriptions: ListClientSubscriptionsUseCase,
    private readonly listMySubscriptions: ListMySubscriptionsUseCase,
    private readonly updatePayment: UpdateSubscriptionPaymentUseCase,
    private readonly overrideStart: OverrideSubscriptionStartUseCase,
    private readonly listRenewalsDue: ListRenewalsDueUseCase,
  ) {}

  listForClient: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const subscriptions = await this.listClientSubscriptions.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        toUserId(clientUserId),
      );
      res.status(200).json({ subscriptions });
    } catch (error) {
      next(error);
    }
  };

  listMine: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const subscriptions = await this.listMySubscriptions.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
      );
      res.status(200).json({ subscriptions });
    } catch (error) {
      next(error);
    }
  };

  listRenewals: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = renewalsDueQuerySchema.parse(req.query);
      const onOrBefore = query.onOrBefore ?? new Date().toISOString().slice(0, 10);
      const renewals = await this.listRenewalsDue.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        onOrBefore,
        query.onOrAfter,
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ renewals });
    } catch (error) {
      next(error);
    }
  };

  updatePaymentHandler: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, subscriptionId } = gymAndSubscriptionIdParamSchema.parse(req.params);
      const body = updateSubscriptionPaymentSchema.parse(req.body);
      const subscription = await this.updatePayment.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        subscriptionId: toSubscriptionId(subscriptionId),
        paymentStatus: body.paymentStatus,
        amountPaid: body.amountPaid ?? null,
      });
      res.status(200).json({ subscription });
    } catch (error) {
      next(error);
    }
  };

  overrideStartHandler: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, subscriptionId } = gymAndSubscriptionIdParamSchema.parse(req.params);
      const body = overrideSubscriptionStartSchema.parse(req.body);
      const subscription = await this.overrideStart.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        subscriptionId: toSubscriptionId(subscriptionId),
        startDate: body.startDate,
      });
      res.status(200).json({ subscription });
    } catch (error) {
      next(error);
    }
  };
}
