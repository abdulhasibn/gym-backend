import type { UserId } from '../../../domain/shared/user-id';
import type { ClientProfile } from './client-profile.entity';

export interface ClientProfileRepository {
  findByUserId(userId: UserId): Promise<ClientProfile | null>;
  save(profile: ClientProfile): Promise<void>;
}
