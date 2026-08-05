import type { StaffCode } from '../../domain/staff-code.value-object';
import type { StaffUserLookup, StaffUserRef } from '../../domain/staff-user-lookup';

export class InMemoryStaffUserLookup implements StaffUserLookup {
  private readonly byCode = new Map<string, StaffUserRef>();

  seed(staffCode: string, user: StaffUserRef): void {
    this.byCode.set(staffCode, user);
  }

  async findLiveByStaffCode(staffCode: StaffCode): Promise<StaffUserRef | null> {
    return this.byCode.get(staffCode.value) ?? null;
  }
}
