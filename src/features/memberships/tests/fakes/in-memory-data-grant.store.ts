import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { DataGrantClass } from '../../domain/data-grant-class';
import type { DataGrantQueries, DataGrantsSnapshot } from '../../domain/data-grant.queries';
import type { DataGrantRepository } from '../../domain/data-grant.repository';
import type { GrantChecklist } from '../../domain/grant-checklist';
import type { OptionalProfileAttribute, ProfileAttribute } from '../../domain/profile-attribute';
import { REQUIRED_PROFILE_ATTRIBUTES } from '../../domain/profile-attribute';

type Key = string;

function key(clientUserId: UserId, gymOrgId: GymOrgId): Key {
  return `${clientUserId}:${gymOrgId}`;
}

export class InMemoryDataGrantStore implements DataGrantRepository, DataGrantQueries {
  private readonly profile = new Map<Key, Set<ProfileAttribute>>();
  private readonly classes = new Map<Key, Set<DataGrantClass>>();
  private readonly activeMembershipKeys = new Set<Key>();

  seedActiveMembership(clientUserId: UserId, gymOrgId: GymOrgId): void {
    this.activeMembershipKeys.add(key(clientUserId, gymOrgId));
  }

  seedRequiredGrants(clientUserId: UserId, gymOrgId: GymOrgId): void {
    const k = key(clientUserId, gymOrgId);
    this.profile.set(k, new Set(REQUIRED_PROFILE_ATTRIBUTES));
    this.classes.set(k, new Set());
  }

  async listForActiveMembership(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<DataGrantsSnapshot | null> {
    const k = key(clientUserId, gymOrgId);
    if (!this.activeMembershipKeys.has(k)) {
      return null;
    }
    return this.snapshot(clientUserId, gymOrgId);
  }

  async replaceOptionalGrants(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    checklist: GrantChecklist,
    _now: Date,
  ): Promise<DataGrantsSnapshot> {
    const k = key(clientUserId, gymOrgId);
    const attrs = new Set<ProfileAttribute>(REQUIRED_PROFILE_ATTRIBUTES);
    for (const attr of checklist.optionalProfileAttributes) {
      attrs.add(attr as OptionalProfileAttribute);
    }
    this.profile.set(k, attrs);
    this.classes.set(k, new Set(checklist.optionalClassGrants));
    return this.snapshot(clientUserId, gymOrgId);
  }

  private snapshot(clientUserId: UserId, gymOrgId: GymOrgId): DataGrantsSnapshot {
    const k = key(clientUserId, gymOrgId);
    return {
      gymOrgId,
      clientUserId,
      profileAttributes: [...(this.profile.get(k) ?? REQUIRED_PROFILE_ATTRIBUTES)],
      classGrants: [...(this.classes.get(k) ?? [])],
    };
  }
}
