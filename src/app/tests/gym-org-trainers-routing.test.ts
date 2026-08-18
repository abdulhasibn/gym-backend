import express, { Router, type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { createErrorHandlerMiddleware } from '../../presentation/http/errors/error-handler.middleware';
import { notFoundMiddleware } from '../../presentation/http/middleware/not-found.middleware';
import type { Logger } from '../../shared/logging/logger.port';
import { createRouter } from '../routes';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

function unused(): RequestHandler {
  return Router();
}

const gymOrgId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('GET /gym-orgs/:gymOrgId/trainers vs coaching mounts', () => {
  it('reaches the gym-org trainers route when coaching routers are also mounted', async () => {
    const gymOrg = unused();
    const trainersRouter = Router({ mergeParams: true });
    trainersRouter.get('/', (_req, res) => {
      res.status(200).json({ trainers: { items: [] } });
    });

    const templates = Router({ mergeParams: true });
    templates.get('/', (_req, res) => {
      res.status(200).json({ dietPlanTemplates: { items: [] } });
    });

    const myDiet = Router({ mergeParams: true });
    myDiet.get('/', (_req, res) => {
      res.status(200).json({ dietPlan: null });
    });

    const exercises = Router();
    exercises.get('/search', (_req, res) => {
      res.status(200).json({ exercises: [] });
    });

    const myWorkout = Router({ mergeParams: true });
    myWorkout.get('/', (_req, res) => {
      res.status(200).json({ workoutPlan: null });
    });

    const app = express();
    app.use(
      createRouter(
        unused(),
        gymOrg,
        trainersRouter,
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        unused(),
        templates,
        myDiet,
        exercises,
        unused(),
        myWorkout,
        unused(),
        unused(),
      ),
    );
    app.use(notFoundMiddleware);
    app.use(createErrorHandlerMiddleware(new SilentLogger()));

    const trainers = await supertest(app).get(`/gym-orgs/${gymOrgId}/trainers`);
    expect(trainers.status).toBe(200);
    expect(trainers.body.trainers).toEqual({ items: [] });

    const listed = await supertest(app).get(`/gym-orgs/${gymOrgId}/diet-plan-templates`);
    expect(listed.status).toBe(200);

    const mine = await supertest(app).get(`/gym-orgs/${gymOrgId}/my-diet-plan`);
    expect(mine.status).toBe(200);

    const search = await supertest(app).get('/exercises/search');
    expect(search.status).toBe(200);

    const myWorkoutPlan = await supertest(app).get(`/gym-orgs/${gymOrgId}/my-workout-plan`);
    expect(myWorkoutPlan.status).toBe(200);
  });
});
