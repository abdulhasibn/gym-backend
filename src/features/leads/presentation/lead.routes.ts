import { Router, type RequestHandler } from 'express';

import type { LeadController } from './lead.controller';

export function createLeadRouter(controller: LeadController, authenticate: RequestHandler): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate);

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/due-follow-ups', controller.listDue);
  router.get('/:leadId', controller.getOne);
  router.patch('/:leadId', controller.update);
  router.patch('/:leadId/status', controller.changeStatus);
  router.delete('/:leadId', controller.softDelete);

  return router;
}
