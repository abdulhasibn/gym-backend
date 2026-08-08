export const MEMBERSHIP_INVITE_STATUSES = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] as const;

export type MembershipInviteStatus = (typeof MEMBERSHIP_INVITE_STATUSES)[number];

export function isMembershipInviteStatus(value: string): value is MembershipInviteStatus {
  return (MEMBERSHIP_INVITE_STATUSES as readonly string[]).includes(value);
}
