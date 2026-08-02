import type { AccountLaneValue } from '../../../domain/shared/account-lane-value';
import { InvalidAccountLaneError } from './invalid-account-lane.error';

export type { AccountLaneValue } from '../../../domain/shared/account-lane-value';

export class AccountLane {
  private constructor(readonly value: AccountLaneValue) {}

  static create(value: string): AccountLane {
    if (value !== 'CLIENT' && value !== 'STAFF') {
      throw new InvalidAccountLaneError();
    }

    return new AccountLane(value);
  }

  equals(other: AccountLane): boolean {
    return this.value === other.value;
  }
}

export function roleCodeForLane(lane: AccountLane): 'CLIENT' | 'STAFF_UNASSIGNED' {
  return lane.value === 'CLIENT' ? 'CLIENT' : 'STAFF_UNASSIGNED';
}
