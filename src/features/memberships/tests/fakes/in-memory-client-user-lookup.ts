import type { ClientUserLookup, ClientUserRef } from '../../domain/client-user-lookup';
import type { InviteeEmail } from '../../domain/invitee-email.value-object';

export class InMemoryClientUserLookup implements ClientUserLookup {
  private readonly byEmail = new Map<string, ClientUserRef>();

  seed(email: string, user: ClientUserRef): void {
    this.byEmail.set(email.trim().toLowerCase(), user);
  }

  async findLiveByEmail(email: InviteeEmail): Promise<ClientUserRef | null> {
    return this.byEmail.get(email.value) ?? null;
  }
}
