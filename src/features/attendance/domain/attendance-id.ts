export type AttendanceId = string & { readonly __brand: 'AttendanceId' };

export function toAttendanceId(raw: string): AttendanceId {
  return raw as AttendanceId;
}
