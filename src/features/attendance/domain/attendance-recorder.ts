export const ATTENDANCE_RECORDERS = ['CLIENT', 'ADMIN'] as const;

export type AttendanceRecorder = (typeof ATTENDANCE_RECORDERS)[number];

export function isAttendanceRecorder(value: string): value is AttendanceRecorder {
  return (ATTENDANCE_RECORDERS as readonly string[]).includes(value);
}
