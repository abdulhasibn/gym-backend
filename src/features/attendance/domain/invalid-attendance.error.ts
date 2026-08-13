export class InvalidAttendanceError extends Error {
  readonly code = 'INVALID_ATTENDANCE';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidAttendanceError';
  }
}
