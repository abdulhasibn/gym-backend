export class AttendanceForbiddenError extends Error {
  readonly code = 'ATTENDANCE_FORBIDDEN';

  constructor(message = 'Not allowed to perform this attendance action') {
    super(message);
    this.name = 'AttendanceForbiddenError';
  }
}
