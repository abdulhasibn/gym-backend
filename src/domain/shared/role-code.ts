export const ROLE_CODES = ['CLIENT', 'STAFF_UNASSIGNED', 'TRAINER', 'ADMIN'] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export function isRoleCode(value: string): value is RoleCode {
  return ROLE_CODES.some((roleCode) => roleCode === value);
}
