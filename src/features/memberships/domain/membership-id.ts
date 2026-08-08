export type MembershipId = string & { readonly __brand: 'MembershipId' };

export function toMembershipId(raw: string): MembershipId {
  return raw as MembershipId;
}
