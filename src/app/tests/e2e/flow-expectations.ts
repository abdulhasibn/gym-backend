/**
 * Expected app behaviour for each IronCore E2E Flow ID.
 * Used by the story reporter so pass/fail rows read as product outcomes,
 * not just "test passed".
 */
export interface FlowExpectation {
  readonly id: string;
  readonly scenario: string;
  /** What the product should do when this flow runs */
  readonly expectedBehaviour: string;
}

export const FLOW_EXPECTATIONS: ReadonlyArray<FlowExpectation> = [
  {
    id: 'AUTH-001',
    scenario: 'Staff OTP → session → /auth/me',
    expectedBehaviour:
      'Arif gets an authenticated STAFF session and /auth/me shows ADMIN after gym create',
  },
  {
    id: 'GYM-001',
    scenario: 'Create IronCore Gym',
    expectedBehaviour: 'Gym exists; Arif is Admin owner of IronCore Gym',
  },
  {
    id: 'GYM-010',
    scenario: 'Client cannot create gym',
    expectedBehaviour: 'CLIENT lane receives 403 on POST /gym-orgs',
  },
  {
    id: 'PLAN-001',
    scenario: 'Create Base plan ₹1500 / 30d',
    expectedBehaviour: 'BASE plan listed with price 1500 and duration 30',
  },
  {
    id: 'PLAN-002',
    scenario: 'Create Trainer addon ₹2000',
    expectedBehaviour: 'ADDON plan with TRAINER_COACHING capability listed at price 2000',
  },
  {
    id: 'STAFF-001',
    scenario: 'Invite Rizwan as Trainer',
    expectedBehaviour: 'Rizwan accepts; roleCode TRAINER; appears on gym trainer list',
  },
  {
    id: 'INVITE-001',
    scenario: 'Admin creates membership invite',
    expectedBehaviour: 'PENDING invite created; Sameer not yet on ACTIVE roster',
  },
  {
    id: 'MEMBER-001',
    scenario: 'Accept → ACTIVE + subscriptions + grants',
    expectedBehaviour:
      'ACTIVE membership; BASE ₹1500 + ADDON ₹2000 snapshots; required DOB/HEIGHT/WEIGHT grants',
  },
  {
    id: 'GRANT-001',
    scenario: 'Optional class grants on accept',
    expectedBehaviour:
      'Chosen class grants (PROGRESS/CALORIES/…) present; MEDICAL_NOTES not auto-granted as class',
  },
  {
    id: 'MEMBER-002',
    scenario: 'Duplicate accept of same invite',
    expectedBehaviour: 'Second accept 4xx; still exactly one ACTIVE membership',
  },
  {
    id: 'MEMBER-010',
    scenario: 'Staff email cannot receive membership invite',
    expectedBehaviour: 'POST membership-invites returns 422 INVALID_MEMBERSHIP_INVITEE',
  },
  {
    id: 'MEMBER-010b',
    scenario: 'Staff cannot accept client invite',
    expectedBehaviour: 'Staff bearer on accept returns 4xx; no membership created',
  },
  {
    id: 'MEMBER-011',
    scenario: 'One ACTIVE membership per client',
    expectedBehaviour: 'ACTIVE at IronCore → Titan invite accept rejected; Titan has no ACTIVE row',
  },
  {
    id: 'CRM-001',
    scenario: 'Lead pipeline → convert → PENDING invite',
    expectedBehaviour: 'Lead CONVERTED; membership invite PENDING with invited email',
  },
  {
    id: 'CRM-002',
    scenario: 'Converted invite → ACTIVE member',
    expectedBehaviour: 'Fahad accepts convert-created invite → ACTIVE + BASE/ADDON lines',
  },
  {
    id: 'SUB-001',
    scenario: 'Unpaid Base still check-in',
    expectedBehaviour: 'Base paymentStatus unpaid → POST check-in still 201',
  },
  {
    id: 'ATTEND-001',
    scenario: 'First client check-in recorded',
    expectedBehaviour: 'Attendance row created for Sameer at IronCore',
  },
  {
    id: 'SUB-002',
    scenario: 'Unpaid Trainer addon still coaching',
    expectedBehaviour: 'Addon unpaid but in-date → trainer diet assign still 201',
  },
  {
    id: 'BLOCK-001',
    scenario: 'Block ≠ payment',
    expectedBehaviour: 'Paid+blocked check-in fails; unpaid+unblocked check-in succeeds',
  },
  {
    id: 'SUB-003',
    scenario: 'Payment mutation + renewals-due',
    expectedBehaviour: 'partial→paid and start-override succeed; renewals-due includes the line',
  },
  {
    id: 'OFFBOARD-001',
    scenario: 'Offboard retention',
    expectedBehaviour:
      'Roster INACTIVE; check-in denied; attendance history retained; Admin still lists subscriptions',
  },
  {
    id: 'GRANT-010',
    scenario: 'Grant then revoke CALORIES',
    expectedBehaviour: 'Staff calorie read 200 with grant; 403 after CALORIES revoked',
  },
  {
    id: 'GRANT-011',
    scenario: 'Offboard clears gym grants',
    expectedBehaviour: 'After offboard, staff progress/calories 403; client grants at gym fail',
  },
  {
    id: 'GRANT-012',
    scenario: 'Rejoin → fresh grants',
    expectedBehaviour: 'Titan accept starts without IronCore class grants; Titan staff denied',
  },
  {
    id: 'PRIV-001',
    scenario: 'Attendance isolation after rejoin',
    expectedBehaviour: 'Titan gym-day / client attendance totals stay 0; IronCore history remains',
  },
  {
    id: 'TENANT-001',
    scenario: 'Cross-gym roster/leads/attendance',
    expectedBehaviour: 'IronCore Admin gets 4xx on Titan members, leads, attendances',
  },
  {
    id: 'TENANT-002',
    scenario: 'Cross-gym subscriptions',
    expectedBehaviour: 'IronCore Admin cannot list/mutate Titan client subscriptions',
  },
  {
    id: 'TENANT-003',
    scenario: 'Cross-gym client-owned progress',
    expectedBehaviour: 'Staff cannot read Bilal progress via Titan or wrong gym path',
  },
  {
    id: 'TENANT-004',
    scenario: 'Cross-gym coaching write',
    expectedBehaviour: 'IronCore trainer diet assign on Titan client returns 4xx',
  },
];

export const FLOW_EXPECTATION_BY_ID: ReadonlyMap<string, FlowExpectation> = new Map(
  FLOW_EXPECTATIONS.map((flow) => [flow.id, flow]),
);

/** Parse Flow IDs from an `it(...)` title, including `TENANT-001..004` ranges. */
export function parseFlowIdsFromTitle(title: string): readonly string[] {
  const ids = new Set<string>();

  const range = title.match(/\b([A-Z][A-Z0-9]+-\d+)\.\.(\d+)\b/);
  if (range?.[1] !== undefined && range[2] !== undefined) {
    const prefixMatch = range[1].match(/^([A-Z][A-Z0-9]+-)(\d+)$/);
    if (prefixMatch?.[1] !== undefined && prefixMatch[2] !== undefined) {
      const prefix = prefixMatch[1];
      const start = Number(prefixMatch[2]);
      const end = Number(range[2]);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        for (let n = start; n <= end; n += 1) {
          ids.add(`${prefix}${String(n).padStart(prefixMatch[2].length, '0')}`);
        }
      }
    }
  }

  for (const match of title.matchAll(/\b([A-Z][A-Z0-9]+-\d+[a-z]?)\b/g)) {
    if (match[1] !== undefined) {
      ids.add(match[1]);
    }
  }

  return [...ids];
}
