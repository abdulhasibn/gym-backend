import type { DataGrantClass } from './data-grant-class';
import type { OptionalProfileAttribute } from './profile-attribute';

/** Optional grants chosen by the client (required DOB/HEIGHT/WEIGHT are always server-applied). */
export interface GrantChecklist {
  readonly optionalProfileAttributes: readonly OptionalProfileAttribute[];
  readonly optionalClassGrants: readonly DataGrantClass[];
}

export function emptyGrantChecklist(): GrantChecklist {
  return {
    optionalProfileAttributes: [],
    optionalClassGrants: [],
  };
}
