import { EmailAddressInvalidError } from './email-address.error';

export class EmailAddress {
  private constructor(readonly value: string) {}

  static create(input: string): EmailAddress {
    const value = input.trim().toLowerCase();

    if (value.length === 0 || value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new EmailAddressInvalidError();
    }

    return new EmailAddress(value);
  }
}
