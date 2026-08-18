export type WearableConnectionId = string & { readonly __brand: 'WearableConnectionId' };

export function toWearableConnectionId(raw: string): WearableConnectionId {
  return raw as WearableConnectionId;
}
