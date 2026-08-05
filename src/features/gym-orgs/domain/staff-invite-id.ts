import type { Brand } from '../../../shared/primitives/brand';

export type StaffInviteId = Brand<string, 'StaffInviteId'>;

export function toStaffInviteId(value: string): StaffInviteId {
  return value as StaffInviteId;
}
