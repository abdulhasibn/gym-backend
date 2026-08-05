import type { Clock } from '../../../../shared/clock/clock';

export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(value: Date): void {
    this.current = value;
  }
}
