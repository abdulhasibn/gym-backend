import { Router, type RequestHandler } from 'express';

/**
 * Feature routers are mounted here by composition-root.
 */
export function createRouter(
  authRouter: RequestHandler,
  gymOrgRouter: RequestHandler,
  gymOrgTrainersRouter: RequestHandler,
  leadsRouter: RequestHandler,
  membershipPlansRouter: RequestHandler,
  membershipInvitesRouter: RequestHandler,
  membershipInviteClientRouter: RequestHandler,
  myDataGrantsRouter: RequestHandler,
  clientSubscriptionsRouter: RequestHandler,
  subscriptionsAdminRouter: RequestHandler,
  mySubscriptionsRouter: RequestHandler,
  membersRouter: RequestHandler,
  myAssignedMembersRouter: RequestHandler,
  attendanceRouter: RequestHandler,
  myAttendancesRouter: RequestHandler,
  meUsersRouter: RequestHandler,
  staffClientUsersRouter: RequestHandler,
  foodsRouter: RequestHandler,
  meCalorieLogRouter: RequestHandler,
  staffClientCalorieLogRouter: RequestHandler,
  staffDietPlanRouter: RequestHandler,
  staffDietTemplateRouter: RequestHandler,
  myDietPlanRouter: RequestHandler,
  exercisesRouter: RequestHandler,
  staffWorkoutScheduleRouter: RequestHandler,
  myWorkoutScheduleRouter: RequestHandler,
  myWorkoutStreakRouter: RequestHandler,
  staffWorkoutTemplateRouter: RequestHandler,
  meWearableRouter: RequestHandler,
  staffClientWearableRouter: RequestHandler,
): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  router.use('/auth', authRouter);
  router.use('/gym-orgs', gymOrgRouter);
  // Specific prefixes only — Express 5 catch-alls steal leftover paths like /trainers.
  router.use('/gym-orgs/:gymOrgId/trainers', gymOrgTrainersRouter);
  router.use('/gym-orgs/:gymOrgId/leads', leadsRouter);
  router.use('/gym-orgs/:gymOrgId/plans', membershipPlansRouter);
  router.use('/gym-orgs/:gymOrgId/membership-invites', membershipInvitesRouter);
  router.use('/gym-orgs/:gymOrgId/my-data-grants', myDataGrantsRouter);
  router.use('/gym-orgs/:gymOrgId/clients/:clientUserId/subscriptions', clientSubscriptionsRouter);
  router.use('/gym-orgs/:gymOrgId/subscriptions', subscriptionsAdminRouter);
  router.use('/gym-orgs/:gymOrgId/my-subscriptions', mySubscriptionsRouter);
  router.use('/gym-orgs/:gymOrgId/members', membersRouter);
  router.use('/gym-orgs/:gymOrgId/my-assigned-members', myAssignedMembersRouter);
  router.use('/gym-orgs/:gymOrgId/attendances', attendanceRouter);
  router.use('/gym-orgs/:gymOrgId/my-attendances', myAttendancesRouter);
  router.use('/me', meUsersRouter);
  router.use('/me', meCalorieLogRouter);
  router.use('/me', meWearableRouter);
  router.use('/foods', foodsRouter);
  router.use('/exercises', exercisesRouter);
  router.use('/gym-orgs/:gymOrgId/clients/:clientUserId', staffClientUsersRouter);
  router.use('/gym-orgs/:gymOrgId/clients/:clientUserId', staffClientCalorieLogRouter);
  router.use('/gym-orgs/:gymOrgId/clients/:clientUserId', staffClientWearableRouter);
  router.use('/gym-orgs/:gymOrgId/clients/:clientUserId', staffDietPlanRouter);
  router.use('/gym-orgs/:gymOrgId/clients/:clientUserId', staffWorkoutScheduleRouter);
  router.use('/gym-orgs/:gymOrgId/diet-plan-templates', staffDietTemplateRouter);
  router.use('/gym-orgs/:gymOrgId/workout-plan-templates', staffWorkoutTemplateRouter);
  router.use('/gym-orgs/:gymOrgId/my-diet-plan', myDietPlanRouter);
  router.use('/gym-orgs/:gymOrgId/my-workout-schedule', myWorkoutScheduleRouter);
  router.use('/gym-orgs/:gymOrgId/my-workout-streak', myWorkoutStreakRouter);
  router.use('/membership-invites', membershipInviteClientRouter);

  return router;
}
