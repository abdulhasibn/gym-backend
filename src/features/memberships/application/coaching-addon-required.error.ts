export class CoachingAddonRequiredError extends Error {
  readonly code = 'COACHING_ADDON_REQUIRED';

  constructor(message = 'An in-date TRAINER_COACHING addon is required to assign a trainer') {
    super(message);
    this.name = 'CoachingAddonRequiredError';
  }
}
