export const STAFF_INVITE_TARGET_ROLES = ['TRAINER', 'ADMIN'] as const;

export type StaffInviteTargetRole = (typeof STAFF_INVITE_TARGET_ROLES)[number];
