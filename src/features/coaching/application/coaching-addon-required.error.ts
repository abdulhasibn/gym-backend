export class CoachingAddonRequiredError extends Error {
  readonly code = 'COACHING_ADDON_REQUIRED';

  constructor(message = 'An in-date TRAINER_COACHING addon is required for diet plan changes') {
    super(message);
    this.name = 'CoachingAddonRequiredError';
  }
}
