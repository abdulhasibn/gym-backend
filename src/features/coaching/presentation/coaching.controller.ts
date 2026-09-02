import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { AssignDietPlanFromTemplateUseCase } from '../application/assign-diet-plan-from-template.use-case';
import type { AssignDietPlanUseCase } from '../application/assign-diet-plan.use-case';
import type { CompleteDietItemUseCase } from '../application/complete-diet-item.use-case';
import type { CompleteScheduleExerciseUseCase } from '../application/complete-schedule-exercise.use-case';
import type { CreateDietPlanTemplateUseCase } from '../application/create-diet-plan-template.use-case';
import type { CreateWorkoutPlanTemplateUseCase } from '../application/create-workout-plan-template.use-case';
import type { DeleteDietPlanTemplateUseCase } from '../application/delete-diet-plan-template.use-case';
import type { DeleteWorkoutPlanTemplateUseCase } from '../application/delete-workout-plan-template.use-case';
import type { DuplicateDietPlanTemplateUseCase } from '../application/duplicate-diet-plan-template.use-case';
import type { DuplicateWorkoutPlanTemplateUseCase } from '../application/duplicate-workout-plan-template.use-case';
import type { GetDietPlanTemplateUseCase } from '../application/get-diet-plan-template.use-case';
import type { GetMyDietPlanUseCase } from '../application/get-my-diet-plan.use-case';
import type { GetMyWorkoutScheduleUseCase } from '../application/get-my-workout-schedule.use-case';
import type { GetMyWorkoutStreakUseCase } from '../application/get-my-workout-streak.use-case';
import type { GetStaffDietPlanUseCase } from '../application/get-staff-diet-plan.use-case';
import type { GetStaffWorkoutScheduleUseCase } from '../application/get-staff-workout-schedule.use-case';
import type { GetStaffWorkoutStreakUseCase } from '../application/get-staff-workout-streak.use-case';
import type { GetWorkoutPlanTemplateUseCase } from '../application/get-workout-plan-template.use-case';
import type { ListDietPlanTemplatesUseCase } from '../application/list-diet-plan-templates.use-case';
import type { ListWorkoutPlanTemplatesUseCase } from '../application/list-workout-plan-templates.use-case';
import type { SearchExercisesUseCase } from '../application/search-exercises.use-case';
import type { UncompleteDietItemUseCase } from '../application/uncomplete-diet-item.use-case';
import type { UncompleteScheduleExerciseUseCase } from '../application/uncomplete-schedule-exercise.use-case';
import type { UpdateDietPlanTemplateUseCase } from '../application/update-diet-plan-template.use-case';
import type { UpdateWorkoutPlanTemplateUseCase } from '../application/update-workout-plan-template.use-case';
import type { UpsertWorkoutScheduleUseCase } from '../application/upsert-workout-schedule.use-case';
import {
  assignDietPlanSchema,
  dietItemParamSchema,
  dietPlanTemplateBodySchema,
  dietTemplateIdParamSchema,
  gymAndClientUserIdParamSchema,
  gymOrgIdParamSchema,
  paginationQuerySchema,
  scheduleItemParamSchema,
  searchExercisesQuerySchema,
  upsertWorkoutScheduleSchema,
  workoutPlanTemplateBodySchema,
  workoutScheduleRangeQuerySchema,
  workoutTemplateIdParamSchema,
} from './coaching.schemas';

export class CoachingController {
  constructor(
    private readonly assignDietPlan: AssignDietPlanUseCase,
    private readonly assignDietPlanFromTemplate: AssignDietPlanFromTemplateUseCase,
    private readonly getStaffDietPlan: GetStaffDietPlanUseCase,
    private readonly getMyDietPlan: GetMyDietPlanUseCase,
    private readonly completeDietItem: CompleteDietItemUseCase,
    private readonly uncompleteDietItem: UncompleteDietItemUseCase,
    private readonly createDietPlanTemplate: CreateDietPlanTemplateUseCase,
    private readonly listDietPlanTemplates: ListDietPlanTemplatesUseCase,
    private readonly getDietPlanTemplate: GetDietPlanTemplateUseCase,
    private readonly duplicateDietPlanTemplate: DuplicateDietPlanTemplateUseCase,
    private readonly updateDietPlanTemplate: UpdateDietPlanTemplateUseCase,
    private readonly deleteDietPlanTemplate: DeleteDietPlanTemplateUseCase,
    private readonly searchExercises: SearchExercisesUseCase,
    private readonly upsertWorkoutSchedule: UpsertWorkoutScheduleUseCase,
    private readonly getStaffWorkoutSchedule: GetStaffWorkoutScheduleUseCase,
    private readonly getMyWorkoutSchedule: GetMyWorkoutScheduleUseCase,
    private readonly completeScheduleExerciseUseCase: CompleteScheduleExerciseUseCase,
    private readonly uncompleteScheduleExerciseUseCase: UncompleteScheduleExerciseUseCase,
    private readonly createWorkoutPlanTemplate: CreateWorkoutPlanTemplateUseCase,
    private readonly listWorkoutPlanTemplates: ListWorkoutPlanTemplatesUseCase,
    private readonly getWorkoutPlanTemplate: GetWorkoutPlanTemplateUseCase,
    private readonly duplicateWorkoutPlanTemplate: DuplicateWorkoutPlanTemplateUseCase,
    private readonly updateWorkoutPlanTemplate: UpdateWorkoutPlanTemplateUseCase,
    private readonly deleteWorkoutPlanTemplate: DeleteWorkoutPlanTemplateUseCase,
    private readonly getMyWorkoutStreak: GetMyWorkoutStreakUseCase,
    private readonly getStaffWorkoutStreak: GetStaffWorkoutStreakUseCase,
  ) {}

  assign: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const body = assignDietPlanSchema.parse(req.body);
      const actor = requireAuthenticatedActor(req);
      if ('templateId' in body) {
        const dietPlan = await this.assignDietPlanFromTemplate.execute(actor, {
          gymOrgId: toGymOrgId(gymOrgId),
          clientUserId,
          templateId: body.templateId,
          title: body.title,
          notes: body.notes,
        });
        res.status(201).json({ dietPlan });
        return;
      }
      const dietPlan = await this.assignDietPlan.execute(actor, {
        gymOrgId: toGymOrgId(gymOrgId),
        clientUserId,
        title: body.title,
        notes: body.notes ?? null,
        meals: body.meals,
      });
      res.status(201).json({ dietPlan });
    } catch (error) {
      next(error);
    }
  };

  staffGet: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const dietPlan = await this.getStaffDietPlan.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
      );
      res.status(200).json({ dietPlan });
    } catch (error) {
      next(error);
    }
  };

  myPlan: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const dietPlan = await this.getMyDietPlan.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
      );
      res.status(200).json({ dietPlan });
    } catch (error) {
      next(error);
    }
  };

  complete: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, itemId } = dietItemParamSchema.parse(req.params);
      await this.completeDietItem.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        itemId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  uncomplete: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, itemId } = dietItemParamSchema.parse(req.params);
      await this.uncompleteDietItem.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        itemId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  createTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = dietPlanTemplateBodySchema.parse(req.body);
      const dietPlanTemplate = await this.createDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        {
          gymOrgId: toGymOrgId(gymOrgId),
          title: body.title,
          notes: body.notes ?? null,
          meals: body.meals,
        },
      );
      res.status(201).json({ dietPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  listTemplates: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = paginationQuerySchema.parse(req.query);
      const dietPlanTemplates = await this.listDietPlanTemplates.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ dietPlanTemplates });
    } catch (error) {
      next(error);
    }
  };

  getTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = dietTemplateIdParamSchema.parse(req.params);
      const dietPlanTemplate = await this.getDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(200).json({ dietPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  duplicateTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = dietTemplateIdParamSchema.parse(req.params);
      const dietPlanTemplate = await this.duplicateDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(201).json({ dietPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  updateTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = dietTemplateIdParamSchema.parse(req.params);
      const body = dietPlanTemplateBodySchema.parse(req.body);
      const dietPlanTemplate = await this.updateDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        {
          gymOrgId: toGymOrgId(gymOrgId),
          templateId,
          title: body.title,
          notes: body.notes ?? null,
          meals: body.meals,
        },
      );
      res.status(200).json({ dietPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  deleteTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = dietTemplateIdParamSchema.parse(req.params);
      await this.deleteDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  search: RequestHandler = async (req, res, next) => {
    try {
      requireAuthenticatedActor(req);
      const query = searchExercisesQuerySchema.parse(req.query);
      const exercises = await this.searchExercises.execute(query.q);
      res.status(200).json({ exercises });
    } catch (error) {
      next(error);
    }
  };

  upsertSchedule: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const body = upsertWorkoutScheduleSchema.parse(req.body);
      const days = await this.upsertWorkoutSchedule.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        clientUserId,
        entries: body.entries,
      });
      res.status(200).json({ days });
    } catch (error) {
      next(error);
    }
  };

  staffGetSchedule: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const query = workoutScheduleRangeQuerySchema.parse(req.query);
      const from = query.date ?? query.from!;
      const to = query.date ?? query.to!;
      const days = await this.getStaffWorkoutSchedule.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
        from,
        to,
      );
      res.status(200).json({ days });
    } catch (error) {
      next(error);
    }
  };

  mySchedule: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = workoutScheduleRangeQuerySchema.parse(req.query);
      const from = query.date ?? query.from!;
      const to = query.date ?? query.to!;
      const result = await this.getMyWorkoutSchedule.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        from,
        to,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  completeSchedule: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, itemId } = scheduleItemParamSchema.parse(req.params);
      await this.completeScheduleExerciseUseCase.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        itemId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  uncompleteSchedule: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, itemId } = scheduleItemParamSchema.parse(req.params);
      await this.uncompleteScheduleExerciseUseCase.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        itemId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  createWorkoutTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = workoutPlanTemplateBodySchema.parse(req.body);
      const workoutPlanTemplate = await this.createWorkoutPlanTemplate.execute(
        requireAuthenticatedActor(req),
        {
          gymOrgId: toGymOrgId(gymOrgId),
          title: body.title,
          notes: body.notes ?? null,
          exercises: body.exercises.map((exercise) => ({
            exerciseItemId: exercise.exerciseItemId,
            sets: exercise.sets ?? null,
            reps: exercise.reps ?? null,
            notes: exercise.notes ?? null,
          })),
        },
      );
      res.status(201).json({ workoutPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  listWorkoutTemplates: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = paginationQuerySchema.parse(req.query);
      const workoutPlanTemplates = await this.listWorkoutPlanTemplates.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ workoutPlanTemplates });
    } catch (error) {
      next(error);
    }
  };

  getWorkoutTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = workoutTemplateIdParamSchema.parse(req.params);
      const workoutPlanTemplate = await this.getWorkoutPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(200).json({ workoutPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  duplicateWorkoutTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = workoutTemplateIdParamSchema.parse(req.params);
      const workoutPlanTemplate = await this.duplicateWorkoutPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(201).json({ workoutPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  updateWorkoutTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = workoutTemplateIdParamSchema.parse(req.params);
      const body = workoutPlanTemplateBodySchema.parse(req.body);
      const workoutPlanTemplate = await this.updateWorkoutPlanTemplate.execute(
        requireAuthenticatedActor(req),
        {
          gymOrgId: toGymOrgId(gymOrgId),
          templateId,
          title: body.title,
          notes: body.notes ?? null,
          exercises: body.exercises.map((exercise) => ({
            exerciseItemId: exercise.exerciseItemId,
            sets: exercise.sets ?? null,
            reps: exercise.reps ?? null,
            notes: exercise.notes ?? null,
          })),
        },
      );
      res.status(200).json({ workoutPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  deleteWorkoutTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = workoutTemplateIdParamSchema.parse(req.params);
      await this.deleteWorkoutPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  myStreak: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const streak = await this.getMyWorkoutStreak.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
      );
      res.status(200).json(streak);
    } catch (error) {
      next(error);
    }
  };

  staffGetStreak: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const streak = await this.getStaffWorkoutStreak.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
      );
      res.status(200).json(streak);
    } catch (error) {
      next(error);
    }
  };
}
