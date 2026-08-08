export class InviteeEmail {
  private constructor(readonly value: string) {}

  static create(input: string): InviteeEmail {
    const value = input.trim().toLowerCase();

    if (value.length === 0 || value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error('Invitee email is invalid');
    }

    return new InviteeEmail(value);
  }
}
