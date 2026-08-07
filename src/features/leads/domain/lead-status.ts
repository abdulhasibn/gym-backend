export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

/** Open = not converted and not lost (soft-warn + due-list). */
export function isOpenLeadStatus(status: LeadStatus): boolean {
  return status !== 'CONVERTED' && status !== 'LOST';
}

export const OPEN_LEAD_STATUSES: readonly LeadStatus[] = LEAD_STATUSES.filter(isOpenLeadStatus);
