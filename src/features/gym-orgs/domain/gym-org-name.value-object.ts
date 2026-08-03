export class GymOrgName {
  private constructor(readonly value: string) {}

  static create(input: string): GymOrgName {
    const value = input.trim();

    if (value.length === 0) {
      throw new Error('Gym organization name cannot be empty');
    }
    if (value.length > 255) {
      throw new Error('Gym organization name cannot exceed 255 characters');
    }

    return new GymOrgName(value);
  }
}
