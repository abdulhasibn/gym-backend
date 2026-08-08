export const REQUIRED_PROFILE_ATTRIBUTES = ['DOB', 'HEIGHT', 'WEIGHT'] as const;
export const OPTIONAL_PROFILE_ATTRIBUTES = ['GENDER', 'MEDICAL_NOTES'] as const;
export const PROFILE_ATTRIBUTES = [
  ...REQUIRED_PROFILE_ATTRIBUTES,
  ...OPTIONAL_PROFILE_ATTRIBUTES,
] as const;

export type RequiredProfileAttribute = (typeof REQUIRED_PROFILE_ATTRIBUTES)[number];
export type OptionalProfileAttribute = (typeof OPTIONAL_PROFILE_ATTRIBUTES)[number];
export type ProfileAttribute = (typeof PROFILE_ATTRIBUTES)[number];

export function isProfileAttribute(value: string): value is ProfileAttribute {
  return (PROFILE_ATTRIBUTES as readonly string[]).includes(value);
}

export function isOptionalProfileAttribute(value: string): value is OptionalProfileAttribute {
  return (OPTIONAL_PROFILE_ATTRIBUTES as readonly string[]).includes(value);
}

export function isRequiredProfileAttribute(value: string): value is RequiredProfileAttribute {
  return (REQUIRED_PROFILE_ATTRIBUTES as readonly string[]).includes(value);
}
