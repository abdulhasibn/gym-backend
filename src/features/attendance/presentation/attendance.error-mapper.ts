import type { ErrorMapper } from '../../../presentation/http/errors/error-mapping';
import { AttendanceForbiddenError } from '../application/attendance-forbidden.error';
import { CheckInNotAllowedError } from '../domain/check-in-not-allowed.error';
import { InvalidAttendanceError } from '../domain/invalid-attendance.error';

export const mapAttendanceError: ErrorMapper = (error) => {
  if (error instanceof AttendanceForbiddenError) {
    return { status: 403, code: error.code, message: error.message };
  }
  if (error instanceof CheckInNotAllowedError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof InvalidAttendanceError) {
    return { status: 422, code: error.code, message: error.message };
  }
  return null;
};
