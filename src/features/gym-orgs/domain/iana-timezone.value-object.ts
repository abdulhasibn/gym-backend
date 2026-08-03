export class IanaTimezone {
  private constructor(readonly value: string) {}

  static create(input: string): IanaTimezone {
    const value = input.trim();

    try {
      Intl.DateTimeFormat('en-US', { timeZone: value });
    } catch {
      throw new Error('Timezone must be a valid IANA timezone');
    }

    return new IanaTimezone(value);
  }
}
