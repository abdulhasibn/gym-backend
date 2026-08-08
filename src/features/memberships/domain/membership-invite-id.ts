export type MembershipInviteId = string & { readonly __brand: 'MembershipInviteId' };

export function toMembershipInviteId(raw: string): MembershipInviteId {
  return raw as MembershipInviteId;
}
