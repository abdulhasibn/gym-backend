import { Router, type RequestHandler } from 'express';

import type { AttendanceController } from './attendance.controller';

export function createAttendanceRouter(
  controller: AttendanceController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);

  router.post('/check-in', controller.checkIn);
  router.post('/check-out', controller.checkOut);
  router.post('/desk-mark', controller.deskMarkPresent);
  router.post('/desk-check-out', controller.deskCheckOut);
  router.get('/present', controller.listPresent);
  router.get('/', controller.listToday);
  router.get('/clients/:clientUserId', controller.listForClient);

  return router;
}

export function createMyAttendancesRouter(
  controller: AttendanceController,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/', controller.listMine);
  return router;
}
