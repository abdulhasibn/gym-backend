import type { UserId } from '../../../../domain/shared/user-id';
import { GymOrg } from '../../domain/gym-org.entity';
import { toGymOrgId } from '../../domain/gym-org-id';
import type { GymOrgId } from '../../domain/gym-org-id';
import type { GymOrgDetail, GymOrgQueries, GymOrgSummary } from '../../domain/gym-org.queries';
import type { CreateOwnedGymOrg, GymOrgRepository } from '../../domain/gym-org.repository';

export class InMemoryGymOrgRepository implements GymOrgRepository, GymOrgQueries {
  private readonly gymOrgs: GymOrg[] = [];
  private readonly adminAffiliations = new Map<string, { userId: UserId; isOwner: boolean }[]>();
  private readonly trainerAffiliations = new Map<string, UserId[]>();
  private nextId = 1;

  async createOwnedGymOrg(command: CreateOwnedGymOrg): Promise<GymOrg> {
    const gymOrg = GymOrg.reconstitute({
      id: toGymOrgId(`11111111-1111-4111-8111-00000000000${this.nextId}`),
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
    this.adminAffiliations.set(gymOrg.id, [{ userId: command.ownerUserId, isOwner: true }]);
    this.trainerAffiliations.set(gymOrg.id, [command.ownerUserId]);
    return gymOrg;
  }

  async findById(id: GymOrgId): Promise<GymOrg | null> {
    return this.gymOrgs.find((gymOrg) => gymOrg.id === id) ?? null;
  }

  async save(gymOrg: GymOrg): Promise<void> {
    const index = this.gymOrgs.findIndex((item) => item.id === gymOrg.id);
    if (index < 0) {
      throw new Error('Gym org not found');
    }
    this.gymOrgs[index] = gymOrg;
  }

  async isLiveAdmin(userId: UserId, gymOrgId: GymOrgId): Promise<boolean> {
    return (this.adminAffiliations.get(gymOrgId) ?? []).some((row) => row.userId === userId);
  }

  seedTrainerAffiliation(gymOrgId: GymOrgId, userId: UserId): void {
    const current = this.trainerAffiliations.get(gymOrgId) ?? [];
    this.trainerAffiliations.set(gymOrgId, [...current, userId]);
  }

  seedAdminAffiliation(gymOrgId: GymOrgId, userId: UserId, isOwner = false): void {
    const current = this.adminAffiliations.get(gymOrgId) ?? [];
    this.adminAffiliations.set(gymOrgId, [...current, { userId, isOwner }]);
  }

  async listForUser(userId: UserId): Promise<readonly GymOrgSummary[]> {
    const summaries: GymOrgSummary[] = [];

    for (const gymOrg of this.gymOrgs) {
      const admin = (this.adminAffiliations.get(gymOrg.id) ?? []).find(
        (row) => row.userId === userId,
      );
      const isTrainer = (this.trainerAffiliations.get(gymOrg.id) ?? []).includes(userId);
      if (admin === undefined && !isTrainer) {
        continue;
      }
      summaries.push({
        id: gymOrg.id,
        name: gymOrg.name.value,
        timezone: gymOrg.timezone.value,
        isOwner: admin?.isOwner ?? false,
      });
    }

    return summaries;
  }

  async getForUser(userId: UserId, gymOrgId: GymOrgId): Promise<GymOrgDetail | null> {
    const gymOrg = await this.findById(gymOrgId);
    if (gymOrg === null) {
      return null;
    }
    const admin = (this.adminAffiliations.get(gymOrgId) ?? []).find((row) => row.userId === userId);
    const isTrainer = (this.trainerAffiliations.get(gymOrgId) ?? []).includes(userId);
    if (admin === undefined && !isTrainer) {
      return null;
    }

    return {
      id: gymOrg.id,
      name: gymOrg.name.value,
      address: gymOrg.address,
      contactPhone: gymOrg.contactPhone,
      contactEmail: gymOrg.contactEmail,
      logoUrl: gymOrg.logoUrl,
      timezone: gymOrg.timezone.value,
      ownerUserId: gymOrg.ownerUserId,
      isOwner: admin?.isOwner ?? false,
      createdAt: gymOrg.createdAt.toISOString(),
      updatedAt: gymOrg.updatedAt.toISOString(),
    };
  }
}
