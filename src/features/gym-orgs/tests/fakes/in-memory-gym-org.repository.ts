import type { UserId } from '../../../../domain/shared/user-id';
import { GymOrg } from '../../domain/gym-org.entity';
import { toGymOrgId } from '../../domain/gym-org-id';
import type { GymOrgQueries, GymOrgSummary } from '../../domain/gym-org.queries';
import type { CreateOwnedGymOrg, GymOrgRepository } from '../../domain/gym-org.repository';

export class InMemoryGymOrgRepository implements GymOrgRepository, GymOrgQueries {
  private readonly gymOrgs: GymOrg[] = [];
  private nextId = 1;

  async createOwnedGymOrg(command: CreateOwnedGymOrg): Promise<GymOrg> {
    const gymOrg = GymOrg.reconstitute({
      id: toGymOrgId(`gym-org-${this.nextId}`),
      name: command.name,
      address: command.address,
      contactPhone: command.contactPhone,
      contactEmail: command.contactEmail,
      logoUrl: command.logoUrl,
      timezone: command.timezone,
      ownerUserId: command.ownerUserId,
      createdAt: new Date('2026-08-02T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
    });
    this.nextId += 1;
    this.gymOrgs.push(gymOrg);
    return gymOrg;
  }

  async listForUser(userId: UserId): Promise<readonly GymOrgSummary[]> {
    return this.gymOrgs
      .filter((gymOrg) => gymOrg.isOwnedBy(userId))
      .map((gymOrg) => ({
        id: gymOrg.id,
        name: gymOrg.name.value,
        timezone: gymOrg.timezone.value,
        isOwner: true,
      }));
  }
}
