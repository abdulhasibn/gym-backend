export const MEMBERSHIP_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export function isMembershipStatus(value: string): value is MembershipStatus {
  return (MEMBERSHIP_STATUSES as readonly string[]).includes(value);
}
