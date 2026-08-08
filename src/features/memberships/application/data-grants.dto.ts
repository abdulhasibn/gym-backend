import type { DataGrantClass } from '../domain/data-grant-class';
import type { DataGrantsSnapshot } from '../domain/data-grant.queries';
import type { ProfileAttribute } from '../domain/profile-attribute';

export interface DataGrantsDto {
  readonly gymOrgId: string;
  readonly clientUserId: string;
  readonly profileAttributes: ProfileAttribute[];
  readonly classGrants: DataGrantClass[];
}

export function toDataGrantsDto(snapshot: DataGrantsSnapshot): DataGrantsDto {
  return {
    gymOrgId: snapshot.gymOrgId,
    clientUserId: snapshot.clientUserId,
    profileAttributes: [...snapshot.profileAttributes],
    classGrants: [...snapshot.classGrants],
  };
}
