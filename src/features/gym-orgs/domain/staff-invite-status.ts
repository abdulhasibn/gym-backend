export const STAFF_INVITE_STATUSES = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] as const;

export type StaffInviteStatus = (typeof STAFF_INVITE_STATUSES)[number];
