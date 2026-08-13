export type ProgressLogId = string & { readonly __brand: 'ProgressLogId' };

export function toProgressLogId(raw: string): ProgressLogId {
  return raw as ProgressLogId;
}
