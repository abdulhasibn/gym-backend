/**
 * Generic branded-type helper (code-quality.mdc). Every feature defines its
 * own domain id types on top of this — e.g.
 *
 *   export type GymOrgId = Brand<string, 'GymOrgId'>;
 *   export const toGymOrgId = (raw: string): GymOrgId => raw as GymOrgId;
 *
 * This file has no business meaning of its own; it only exists so every
 * feature brands its ids the same way instead of reinventing the pattern.
 */
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };
