import type { Brand } from '../../../shared/primitives/brand';

export type RoleId = Brand<string, 'RoleId'>;

export function toRoleId(value: string): RoleId {
  return value as RoleId;
}
