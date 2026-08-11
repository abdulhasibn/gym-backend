import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { GymOrgId } from '../../domain/shared/gym-org-id';
import type { UserId } from '../../domain/shared/user-id';
import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { AcceptStaffInviteUseCase } from './application/accept-staff-invite.use-case';
import { CreateGymOrgPolicy } from './application/create-gym-org.policy';
import { CreateGymOrgUseCase } from './application/create-gym-org.use-case';
import { CreateStaffInviteUseCase } from './application/create-staff-invite.use-case';
import { GetGymOrgUseCase } from './application/get-gym-org.use-case';
import { GymOrgAdminPolicy } from './application/gym-org-admin.policy';
import { ListGymStaffInvitesUseCase } from './application/list-gym-staff-invites.use-case';
import { ListMyGymOrgsUseCase } from './application/list-my-gym-orgs.use-case';
import { ListMyStaffInviteInboxUseCase } from './application/list-my-staff-invite-inbox.use-case';
import { RevokeStaffInviteUseCase } from './application/revoke-staff-invite.use-case';
import { UpdateGymOrgUseCase } from './application/update-gym-org.use-case';
import { SupabaseGymOrgQueries } from './infrastructure/supabase-gym-org.queries';
import { SupabaseGymOrgRepository } from './infrastructure/supabase-gym-org.repository';
import { SupabaseStaffInviteQueries } from './infrastructure/supabase-staff-invite.queries';
import { SupabaseStaffInviteRepository } from './infrastructure/supabase-staff-invite.repository';
import { SupabaseStaffUserLookup } from './infrastructure/supabase-staff-user-lookup';
import { SupabaseTrainerProfileDirectory } from './infrastructure/supabase-trainer-profile.directory';
import { GymOrgController } from './presentation/gym-org.controller';
import { mapGymOrgError } from './presentation/gym-org.error-mapper';
import { createGymOrgRouter } from './presentation/gym-org.routes';

export function composeGymOrgFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const gymOrgs = new SupabaseGymOrgRepository(dataClient);
  const gymOrgQueries = new SupabaseGymOrgQueries(dataClient);
  const trainerProfiles = new SupabaseTrainerProfileDirectory(dataClient);
  const staffInvites = new SupabaseStaffInviteRepository(dataClient);
  const staffInviteQueries = new SupabaseStaffInviteQueries(dataClient);
  const staffUsers = new SupabaseStaffUserLookup(dataClient);
  const adminPolicy = new GymOrgAdminPolicy(gymOrgs);

  const controller = new GymOrgController(
    new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy()),
    new ListMyGymOrgsUseCase(gymOrgQueries),
    new GetGymOrgUseCase(gymOrgQueries),
    new UpdateGymOrgUseCase(gymOrgs, adminPolicy, clock),
    new CreateStaffInviteUseCase(adminPolicy, staffInvites, staffUsers, clock, ids),
    new ListGymStaffInvitesUseCase(adminPolicy, staffInviteQueries),
    new ListMyStaffInviteInboxUseCase(staffInviteQueries),
    new AcceptStaffInviteUseCase(staffInvites, clock),
    new RevokeStaffInviteUseCase(adminPolicy, staffInvites, clock),
  );

  return {
    router: createGymOrgRouter(controller, authenticate),
    errorMapper: mapGymOrgError,
    isLiveAdmin: (userId: UserId, gymOrgId: GymOrgId) => gymOrgs.isLiveAdmin(userId, gymOrgId),
    findLiveTrainerProfileId: (userId: UserId, gymOrgId: GymOrgId) =>
      trainerProfiles.findLiveTrainerProfileId(userId, gymOrgId),
    isLiveTrainerProfile: (trainerProfileId: string, gymOrgId: GymOrgId) =>
      trainerProfiles.isLiveTrainerProfile(trainerProfileId, gymOrgId),
  };
}
