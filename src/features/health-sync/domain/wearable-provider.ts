export const WEARABLE_PROVIDERS = ['APPLE_HEALTH', 'HEALTH_CONNECT', 'SAMSUNG_HEALTH'] as const;

export type WearableProviderCode = (typeof WEARABLE_PROVIDERS)[number];

export class WearableProvider {
  private constructor(readonly code: WearableProviderCode) {}

  static create(input: string): WearableProvider {
    if (!WEARABLE_PROVIDERS.includes(input as WearableProviderCode)) {
      throw new Error(`Wearable provider must be one of: ${WEARABLE_PROVIDERS.join(', ')}`);
    }
    return new WearableProvider(input as WearableProviderCode);
  }

  static reconstitute(code: WearableProviderCode): WearableProvider {
    return new WearableProvider(code);
  }
}

export function parseWearableProvider(value: string): WearableProviderCode {
  return WearableProvider.create(value).code;
}
