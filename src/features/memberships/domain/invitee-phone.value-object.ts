export class InviteePhone {
  private constructor(readonly value: string) {}

  static create(input: string): InviteePhone {
    const value = input.trim();

    if (value.length === 0) {
      throw new Error('Invitee phone cannot be empty');
    }
    if (value.length > 32) {
      throw new Error('Invitee phone cannot exceed 32 characters');
    }

    return new InviteePhone(value);
  }
}
