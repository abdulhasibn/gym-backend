import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { HealthSyncForbiddenError } from '../application/health-sync-forbidden.error';

export const mapHealthSyncError: ErrorMapper = (error) => {
  if (error instanceof HealthSyncForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  return null;
};
