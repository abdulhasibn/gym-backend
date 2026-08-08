/** Product modules — bullets + how-it-works detail for the showcase */
window.MODULES_DATA = [
  {
    id: "M1",
    name: "Identity & Access",
    filters: ["client", "trainer", "admin", "platform"],
    tags: ["client", "trainer", "admin"],
    personas: "All personas authenticate here; lane is locked on first provision.",
    summary:
      "One auth path for sign-up and login. Email OTP is canonical; Google is secondary. First success creates the app user and locks CLIENT or STAFF lane.",
    howItWorks: [
      "Request OTP → verify (lane required only when isNewUser).",
      "Google start/callback → complete with lane on first provision.",
      "Refresh rotates tokens; /auth/me restores cold-start UI.",
      "Frozen roles: CLIENT, STAFF_UNASSIGNED, TRAINER, ADMIN — gyms cannot edit RBAC.",
    ],
    items: [
      "Email OTP auth (canonical, free transactional email) — API live",
      "Google OAuth + email link — API live",
      "Frozen roles + permissions; CLIENT | STAFF lanes",
      "Admin-as-Trainer capability",
    ],
    detail: {
      purpose:
        "Authenticate users, choose account lane, and establish frozen system roles. No gym powers until affiliation (staff invite or membership accept).",
      howItWorks: [
        "No separate sign-up screen — first OTP verify or Google complete provisions the User.",
        "Lane CLIENT vs STAFF is permanent (LANE_MISMATCH if the other is sent later).",
        "STAFF starts as STAFF_UNASSIGNED with a staff_code / QR until they create an org or accept a staff invite.",
        "CLIENT has no gym powers until they accept a membership invite.",
        "Authz later stacks: permission code ∧ affiliation ∧ tenant ∧ DataGrant (for Client-owned reads).",
      ],
      acceptance: [
        "OTP request/verify and Google complete return session + user with lane/roleCode.",
        "Returning users omit lane; refresh replaces both tokens.",
      ],
      prdRefs: "C1, T1, A1 · PRD §3–§4 · §7.1",
    },
  },
  {
    id: "M2",
    name: "Gym Organization",
    filters: ["admin", "trainer", "client"],
    tags: ["admin"],
    personas: "Admin creates and configures; Trainers accept staff invites; Clients only see gym profile on membership invites.",
    summary:
      "Tenant root for the product. Owner creates a Gym Org, then invites staff via staff_code / QR. Client membership invites are issued under M3.",
    howItWorks: [
      "STAFF_UNASSIGNED or ADMIN creates org → owner Admin (+ optional trainer profile).",
      "Admin issues staff invites; invitee inbox embeds gym profile.",
      "Accept upgrades role to TRAINER or desk ADMIN (Admin cap ~3).",
      "MVP UI is single-gym even if an owner can own multiple orgs in data.",
    ],
    items: [
      "GymOrg create / profile / branding / timezone — API live",
      "Client membership invites (in-app list) — see M3",
      "Staff invites via staff_code / QR — API live",
      "Ownership: multi-org in DB, single-gym UI",
      { text: "Open gym join codes", out: true },
    ],
    detail: {
      purpose:
        "Create and configure the gym tenant; issue staff invites; own branding and timezone used for calendar-day rules.",
      howItWorks: [
        "Create/list/get/patch gym profile (name, address, contact, logo, timezone).",
        "Staff invites are in-app codes — not email magic links. Default expiry 14 days.",
        "Invitee must be STAFF lane; cannot accept into a gym they already belong to.",
        "Client join is not a gym code — Admin membership invite only (M3).",
      ],
      acceptance: [
        "Owner can create org and list affiliations.",
        "Staff invite create → inbox → accept updates role and affiliations.",
      ],
      prdRefs: "A1, A2, A2b, T2 · PRD §5.1",
    },
  },
  {
    id: "M3",
    name: "Members & Memberships",
    filters: ["admin", "client", "trainer"],
    tags: ["admin", "client"],
    personas: "Admin invites and manages roster; Client accepts and manages grants; Trainer sees assigned clients later.",
    summary:
      "Invite-only join path. Accept creates an ACTIVE membership with snapshotted subscriptions and required DataGrants. One ACTIVE membership per client.",
    howItWorks: [
      "Admin creates invite with base (± addon) and payment statuses.",
      "Client inbox matches invited user/email; accept is atomic.",
      "Required grants DOB/HEIGHT/WEIGHT; optional checklist defaults off.",
      "Offboard → INACTIVE and clears grants; attendance/billing retained by gym.",
    ],
    items: [
      "Invite accept → ACTIVE membership + base sub — API live",
      "DataGrants: profile attributes + class grants (no copy) — API live",
      "Roster: ACTIVE / INACTIVE — next (1.6)",
      "Trainer assignment (requires active Trainer addon) — next (1.6)",
      "Offboard clears grants; attendance retained — next (1.6)",
      "Block check-in (Admin safety valve) — next (1.6)",
    ],
    detail: {
      purpose:
        "Turn Admin-issued invites into live members with consent grants; later manage roster, trainer links, offboard, and check-in blocks.",
      howItWorks: [
        "No shadow profiles — roster shows pending invites until accept; membership row appears only after accept.",
        "Accept blocked if client already has ACTIVE membership elsewhere.",
        "While ACTIVE, Client toggles optional grants; required vitals stay sticky.",
        "Trainer assign only with in-date TRAINER_COACHING addon.",
        "Block check-in is manual — not auto-tied to unpaid status.",
      ],
      acceptance: [
        "Happy path: BASE plan → invite → Client accept + grants → ACTIVE membership id returned.",
        "ACTIVE_MEMBERSHIP_CONFLICT when a second accept is attempted.",
      ],
      prdRefs: "C2–C2c, C3, A3, A4, A6, A15, A17, A18 · PRD §5.2–§5.4 · §5.12",
    },
  },
  {
    id: "M4",
    name: "Plans & Billing Status",
    filters: ["admin", "client"],
    tags: ["admin", "client"],
    personas: "Admin owns catalog and payment status; Client views lines and renewals.",
    summary:
      "Admin-named BASE and ADDON catalog. Subscription lines snapshot price/duration. Payment status is tracked — no payment gateway in MVP.",
    howItWorks: [
      "BASE required for every membership; TRAINER_COACHING addon unlocks coaching.",
      "Accept snapshots catalog price/duration onto subscription rows.",
      "Base start: first attendance or Admin override; addon: attach day.",
      "Renewal = new row per period; T-2 and unpaid digests are later jobs.",
    ],
    items: [
      "Admin-named catalog: kind BASE | ADDON + capability — API live",
      "Base subscription required; Trainer addon optional — snapshot on accept live",
      "Price/duration snapshot on each subscription line — on accept",
      "Payment status per line: paid / unpaid / partial — Admin APIs next (1.5)",
      "Base start: first attendance | override; addon: attach day — next (1.5)",
      "Renewals: new row per period; T-2 for base + addon",
      "Daily Admin nudge for unpaid / partial lines",
    ],
    detail: {
      purpose:
        "Sell membership products and track billing status without collecting card payments in-app.",
      howItWorks: [
        "Catalog CRUD for active BASE/ADDON plans; ADDON requires capability enum.",
        "Unpaid/partial does not auto-revoke entitlements — dates do. Coaching stops on addon expiry.",
        "Admin sees payment badges; daily unpaid nudge is Admin-facing.",
        "DB enforces non-overlapping in-date lines (ADR-0004).",
      ],
      acceptance: [
        "Admin can create BASE plan used on invites.",
        "Accept creates snapshotted subscription line(s).",
      ],
      prdRefs: "A7, A8, A8b, A9, A10, A10b, A19, C10, C11 · PRD §5.7–§5.9 · §5.13",
    },
  },
  {
    id: "M5",
    name: "Attendance",
    filters: ["client", "admin", "trainer"],
    tags: ["client", "admin"],
    personas: "Client self check-in; Admin desk mark and logs; Trainer view-only later.",
    summary:
      "Gym-owned check-ins for the current ACTIVE membership. First attendance may start a base subscription when start_date is null.",
    howItWorks: [
      "Client taps Check in → timestamped record for current gym.",
      "Admin can mark present at desk (forgot phone).",
      "Blocked clients cannot check in until Admin clears the block.",
      "Trainer cannot log attendance in MVP.",
    ],
    items: [
      "Client self check-in",
      "Admin desk mark",
      "Per-client / per-day / gym-wide logs",
      { text: "Trainer log, QR, geofence", out: true },
    ],
    detail: {
      purpose: "Record presence for ops and (optionally) start the base subscription clock.",
      howItWorks: [
        "Requires ACTIVE membership, not blocked, and in-date base (null start or today in range per gym timezone).",
        "Attendance is retained after offboard — gym-owned history.",
        "No per-day unique constraint in MVP; QR/geofence deferred.",
      ],
      acceptance: ["ACTIVE member with in-date base can self check-in; Admin can desk-mark and list logs."],
      prdRefs: "C4, A5, A18 · PRD §5.6",
    },
  },
  {
    id: "M6",
    name: "Coaching — Diet",
    filters: ["trainer", "client", "admin"],
    tags: ["trainer", "client"],
    personas: "Trainer/Admin-as-Trainer assigns; Client completes per day; other staff need grants for adherence.",
    summary:
      "Structured diet plans assigned only while TRAINER_COACHING addon is active. Completions are Client-owned; staff adherence needs DIET_PLANS grant.",
    howItWorks: [
      "Assign hybrid plan: meals/slots/targets + free-text notes.",
      "Client marks items complete per calendar day (gym timezone).",
      "Assigning trainer may edit definition without class grant.",
      "Addon expiry → read-only history; no new writes.",
    ],
    items: [
      "Structured meals / slots / targets",
      "Free-text notes",
      "Assign only with active Trainer addon",
      "Per-day PlanCompletion; staff adherence needs DIET_PLANS grant",
      "Clone / template (P1 UI)",
    ],
    detail: {
      purpose: "Deliver diet programming as the coaching wedge — without PDF-as-plan.",
      howItWorks: [
        "Plans are Client-owned instances with assigning gym/trainer as provenance.",
        "Without active addon: hide coaching or show empty state.",
        "Clone/template supported in data; UI may be P1.",
      ],
      acceptance: ["With active addon, trainer assigns plan; Client can complete items for today."],
      prdRefs: "C5, T5, T7, T8 · PRD §5.5 · §5.13",
    },
  },
  {
    id: "M7",
    name: "Coaching — Workout",
    filters: ["trainer", "client", "admin"],
    tags: ["trainer", "client"],
    personas: "Same entitlement model as diet coaching.",
    summary:
      "Days → exercises → sets/reps with notes. Same addon gate and grant rules as diet (WORKOUT_PLANS for adherence).",
    howItWorks: [
      "Assign structured workout + notes while addon is in-date.",
      "Client marks sessions/exercises complete per calendar day.",
      "Adherence for other staff requires WORKOUT_PLANS grant.",
      "Expiry freezes new assignments; history stays readable.",
    ],
    items: [
      "Days → exercises → sets/reps",
      "Free-text notes",
      "Assign only with active Trainer addon",
      "Per-day PlanCompletion; staff adherence needs WORKOUT_PLANS grant",
      "Clone / template (P1 UI)",
    ],
    detail: {
      purpose: "Pair workout programming with diet under the same TRAINER_COACHING entitlement.",
      howItWorks: [
        "Mirrors diet ownership and grant rules.",
        "Reassignment preserves plan history within the gym provenance model.",
      ],
      acceptance: ["Addon-gated assign + Client daily complete works end-to-end."],
      prdRefs: "C6, T6, T7, T8 · PRD §5.5 · §5.13",
    },
  },
  {
    id: "M8",
    name: "Progress & Body Metrics",
    filters: ["client", "trainer", "admin"],
    tags: ["client", "trainer"],
    personas: "Client owns logs; staff see only granted fields.",
    summary:
      "Client-owned ProgressLog is the canonical weight history. BMI uses profile height + current weight when both are visible/granted.",
    howItWorks: [
      "Client edits profile; weight upserts today’s ProgressLog.",
      "Staff see granted profile attributes and PROGRESS class data only.",
      "Attendance history is gym-owned and always visible to affiliated staff.",
      "Plan adherence % needs matching class grants.",
    ],
    items: [
      "Client-owned ProgressLog (canonical weight)",
      "BMI from profile height + current weight",
      "Attendance history (gym-owned)",
      "Plan adherence % (staff needs class grant)",
      "Profile: height, DOB, gender, medical notes",
    ],
    detail: {
      purpose: "Give members a personal progress surface and staff a grant-gated view — never a gym-owned copy of body data.",
      howItWorks: [
        "Medical notes only with MEDICAL_NOTES grant.",
        "Health sync weight also feeds ProgressLog (M10).",
        "Absent grant = empty state “Not shared by member”.",
      ],
      acceptance: ["Client can edit profile/weight; staff without PROGRESS cannot see trend."],
      prdRefs: "C7, C8, C14, T4, A17 · ADR-0002",
    },
  },
  {
    id: "M9",
    name: "Nutrition",
    filters: ["client", "trainer", "admin"],
    tags: ["client"],
    personas: "Client logs meals; staff need CALORIES grant to read.",
    summary:
      "Owned Indian FoodItem catalog with NL/qty parsing and mandatory manual fallback. No barcode or third-party nutrition APIs.",
    howItWorks: [
      "Client types “2 idlis, 1 omelette” or searches catalog.",
      "Parser returns calories/macros → confirm → CalorieLogEntry.",
      "Misses fall back to manual calorie/macro entry.",
      "Staff read diary only with CALORIES class grant.",
    ],
    items: [
      "Client-owned calorie diary",
      "Owned Indian FoodItem catalog",
      "NL / qty parser (“2 idlis, 1 omelette”)",
      "Daily calorie / macro log vs target",
      "Manual entry fallback",
      "Staff read only with CALORIES grant",
    ],
    detail: {
      purpose: "Make daily food logging practical for Indian staples without depending on external nutrition APIs.",
      howItWorks: [
        "Catalog seeded ~200–500 staples (AI bootstrap + human vet).",
        "Calorie logs are Client-owned; leave gym does not delete them.",
      ],
      acceptance: ["Phrase resolves from catalog or manual save succeeds."],
      prdRefs: "C9 · PRD §5.10 · §7.3",
    },
  },
  {
    id: "M10",
    name: "Health Sync",
    filters: ["client", "trainer", "admin"],
    tags: ["client"],
    personas: "Client connects providers; staff need WEARABLES (and/or PROGRESS for weight).",
    summary:
      "Live read-only sync from Apple Health, Health Connect, and Samsung Health into Client-owned metrics. Showcase = production — not stubbed.",
    howItWorks: [
      "Client connects provider on device.",
      "Sync steps, workouts, active calories, weight.",
      "Weight upserts ProgressLog and profile current weight.",
      "Staff visibility gated by grants.",
    ],
    items: [
      "Client-owned wearable connection + daily metrics",
      "Apple Health (HealthKit)",
      "Google Health Connect",
      "Samsung Health",
      "Sync: steps, workouts, active calories, weight",
      "Staff read only with WEARABLES grant",
    ],
    detail: {
      purpose: "Bring wearable truth into the member’s own data graph without making the gym the owner.",
      howItWorks: [
        "Connection and metrics have no owning gym_org_id.",
        "iOS uses HealthKit; Android prefers Health Connect.",
      ],
      acceptance: ["Live sync path works on showcase/production builds."],
      prdRefs: "C12 · PRD §5.11 · §7.2",
    },
  },
  {
    id: "M11",
    name: "Mini-CRM",
    filters: ["admin"],
    tags: ["admin"],
    personas: "Admin desk only.",
    summary:
      "Gym-owned leads before membership. Soft warn on duplicate open-lead phone. Convert to membership invite is P1.",
    howItWorks: [
      "Capture name, phone, source, interest, notes.",
      "Pipeline: New → Contacted → Trial → Converted → Lost.",
      "Set follow-up date; due list for Admins.",
      "Push/inbox delivery of reminders waits for notifications stint.",
    ],
    items: [
      "Lead capture (soft duplicate phone warn) — API live",
      "Pipeline: New → Contacted → Trial → Converted → Lost — API live",
      "Follow-up date + due list — API live (push later)",
      "Convert → membership invite (P1)",
    ],
    detail: {
      purpose: "Keep walk-ins and phone leads from falling through before they become members.",
      howItWorks: [
        "Phone is not unique — soft warning only.",
        "Convert (P1) prefills membership invite; membership still requires Client accept.",
      ],
      acceptance: ["CRUD + pipeline + due list work for Admin at a gym."],
      prdRefs: "A11–A14 · PRD §5.8",
    },
  },
  {
    id: "M12",
    name: "Notifications & Inbox",
    filters: ["client", "trainer", "admin", "platform"],
    tags: ["admin", "client"],
    personas: "All personas receive events; Admin web inbox for ops queues.",
    summary:
      "Push + in-app notifications; Admin web inbox for renewals, unpaid digests, and lead follow-ups. WhatsApp/SMS out of MVP.",
    howItWorks: [
      "T-2 renewals to Client + Admins.",
      "Daily unpaid/partial digest to Admins.",
      "Invite, assign, and block events notify involved parties.",
      "Jobs must be idempotent.",
    ],
    items: [
      "Push (FCM / APNs)",
      "In-app notifications",
      "Admin web inbox (renewals, unpaid nudge, lead follow-ups)",
      { text: "WhatsApp / reminder SMS", out: true },
    ],
    detail: {
      purpose: "Close the loop on renewals and desk ops without SMS cost in MVP.",
      howItWorks: ["See PRD §8 notification matrix for triggers, recipients, and timing."],
      acceptance: ["T-2 / unpaid / lead-follow-up jobs fire idempotently with inbox + push."],
      prdRefs: "C11, A10, A10b, M12 · PRD §8",
    },
  },
  {
    id: "M13",
    name: "Platform / Shared",
    filters: ["platform", "admin"],
    tags: ["admin"],
    personas: "Cross-cutting — every feature depends on these rails.",
    summary:
      "Tenancy, DataGrants, soft delete, audit, scheduled jobs, and branding storage underpin the modules above.",
    howItWorks: [
      "Gym-owned rows always scoped by gym_org_id.",
      "Client-owned reads require live grants.",
      "Soft delete via deleted_at; DPDP erasure is separate.",
      "Audit sensitive ops (payments, desk attendance, blocks, grants).",
    ],
    items: [
      "Tenancy (gym_org_id for GymOwned)",
      "DataGrants for ClientOwned reads",
      "Soft delete via deleted_at; DPDP erasure path",
      "Audit trail",
      "Scheduled jobs (T-2 renewals, unpaid digest, follow-ups)",
      "File / branding storage",
    ],
    detail: {
      purpose: "Shared infrastructure and invariants that keep multi-tenant gym SaaS safe and auditable.",
      howItWorks: [
        "Runtime authz = permission ∧ affiliation ∧ tenant ∧ grant (when Client-owned).",
        "Feature-scoped RLS deferred while API uses service-role with app policies.",
      ],
      acceptance: ["Sensitive ops write audit; jobs are idempotent; grants deny by default."],
      prdRefs: "M13 · ADR-0002 · ADR-0003 · ADR-0005 · PRD §9",
    },
  },
];
