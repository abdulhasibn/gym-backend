import express, { type Express, type NextFunction, type Request, type Response } from 'express';

import { loadEnvironment } from './config/environment';
import { composeApp } from './app/composition-root';

/**
 * Vercel Express entrypoint (https://vercel.com/docs/frameworks/backend/express).
 * Detected as `src/server.ts`. App is composed lazily so the build can import
 * this module without production secrets present at compile time.
 * Local process entry remains `src/app/http-server.ts` (`pnpm dev` / `pnpm start`).
 */
let cachedApp: Express | undefined;

function getApp(): Express {
  if (cachedApp === undefined) {
    const config = loadEnvironment();
    cachedApp = composeApp(config).app;
  }
  return cachedApp;
}

const server = express();
server.use((req: Request, res: Response, next: NextFunction) => {
  getApp()(req, res, next);
});

export default server;
