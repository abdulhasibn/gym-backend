export type TrainerProfileId = string & { readonly __brand: 'TrainerProfileId' };

export function toTrainerProfileId(raw: string): TrainerProfileId {
  return raw as TrainerProfileId;
}
