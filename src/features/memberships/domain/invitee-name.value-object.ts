export class InviteeName {
  private constructor(readonly value: string) {}

  static create(input: string): InviteeName {
    const value = input.trim();

    if (value.length === 0) {
      throw new Error('Invitee name cannot be empty');
    }
    if (value.length > 255) {
      throw new Error('Invitee name cannot exceed 255 characters');
    }

    return new InviteeName(value);
  }
}
