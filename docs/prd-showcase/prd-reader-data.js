/** Curated long-form PRD for in-app reader — keep faithful to docs/PRD.md */
window.PRD_READER = {
  title: "Gym SaaS MVP — Full PRD",
  kicker: "Draft v2.3 · India-first",
  sections: [
    {
      id: "purpose",
      title: "1. Purpose & positioning",
      paragraphs: [
        "Production MVP for a gym management SaaS with three hard-coded personas — Client, Trainer, Admin. Replaces spreadsheets/registers for small Indian gyms: memberships, attendance, renewals, leads, trainer-led diet/workout coaching, plus a Client app for plans, progress, calorie logging, and health-app sync.",
        "Buyer is the Admin (gym owner/manager). Wedge is subscription renewal tracking + mini-CRM + desk ops. Retention differentiator is Trainer (or Admin-as-Trainer) diet + workout programming. Beachhead: solo / small owner-operator gyms. Delivery is a big-bang production app — showcase build is production, not a stubbed PoC.",
      ],
      bullets: [
        "Surfaces: React Native (Client + Trainer; light Admin) · Next.js Admin web · Express API + Supabase.",
        "Join is Admin membership invite only — no open gym codes, no maps directory.",
        "Billing is base + addons; coaching requires an active TRAINER_COACHING addon.",
        "Personal fitness data is Client-owned with DataGrants; gym never gets a copy.",
      ],
    },
    {
      id: "decisions",
      title: "1.3 Locked decisions",
      bullets: [
        "At most one ACTIVE membership per client (no multi-gym roaming under one sub).",
        "Client-owned: profile, progress, calories, wearables, assigned diet/workout + completions. Staff read only via live grants.",
        "Roles are system-seeded and frozen (CLIENT, STAFF_UNASSIGNED, TRAINER, ADMIN). Not customer RBAC.",
        "No Client + Staff on one account; Admin-as-Trainer remains on the staff lane.",
        "No shadow profiles — membership exists only after invite accept.",
        "Email + OTP is canonical identity; Google secondary with verified email; phone is contact-only.",
        "Soft delete via deleted_at; DPDP erasure is a separate privileged path.",
        "Calendar-day rules use gym_orgs.timezone (default Asia/Kolkata).",
      ],
    },
    {
      id: "goals",
      title: "2. Goals & non-goals",
      paragraphs: [
        "Admin stands up a gym, invites staff, manages clients/attendance/subscriptions/leads. Trainer (or Admin-as-Trainer) delivers structured plans. Client accepts invite, manages grants, checks in, follows plans, tracks progress/BMI, logs Indian meals, syncs health apps. Automate T-2 renewal reminders and a lightweight CRM.",
      ],
      bullets: [
        "Out: multi-gym roaming, auto grant inheritance, shadow profiles, payment gateway, WhatsApp/SMS, maps directory, barcode food, Facebook login, QR/geofence check-in, Hindi UI, multi-branch switcher, custom RBAC, class booking, POS, AI-generated coaching plans.",
      ],
    },
    {
      id: "personas",
      title: "3. Personas & roles",
      paragraphs: [
        "Signup locks a lane (CLIENT vs STAFF). Gym powers come from affiliations + role_permissions. Admin-as-Trainer = Admin also gets a trainer_profiles row.",
      ],
      html: `<table>
        <thead><tr><th>Role</th><th>How they enter</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>Admin</td><td>STAFF creates Gym Org, or accepts desk Admin staff invite</td><td>Owner + capped desk Admins (~3); may also train</td></tr>
          <tr><td>Trainer</td><td>STAFF accepts staff invite via staff_code / QR</td><td>Assigned roster + coaching; no desk attendance write</td></tr>
          <tr><td>Client</td><td>Accepts Admin membership invite</td><td>At most one ACTIVE membership</td></tr>
        </tbody>
      </table>`,
    },
    {
      id: "client",
      title: "4.1 Client features (P0 highlights)",
      bullets: [
        "C1 Email OTP (+ Google) login — first success provisions the account.",
        "C2 / C2b / C2c Membership invite inbox, accept with required DOB/HEIGHT/WEIGHT grants + optional checklist; manage grants while ACTIVE.",
        "C3 Trainer assign when TRAINER_COACHING addon is active.",
        "C4 Self check-in.",
        "C5–C6 Diet/workout view + per-day completions (addon-gated).",
        "C7–C8 Progress, attendance history, BMI from height + current weight.",
        "C9 Calorie log via owned Indian food catalog / NL parser; manual fallback.",
        "C10 View base + addon subscriptions and renewals.",
        "C11 T-2 renewal reminders (push + in-app).",
        "C12 Live Apple Health / Health Connect / Samsung Health sync.",
        "C14 Edit profile (weight also writes ProgressLog).",
        "C15 DPDP erasure request (P1).",
      ],
    },
    {
      id: "trainer",
      title: "4.2 Trainer features",
      bullets: [
        "T1–T2 STAFF signup + accept staff invite → TRAINER.",
        "T3 Assigned client list.",
        "T4 Granted profile/progress + gym-owned attendance.",
        "T5–T6 Assign diet/workout (addon required; definition edit does not need class grant).",
        "T7 Clone/template (P1).",
        "T8 Adherence % needs DIET_PLANS / WORKOUT_PLANS grant (P1).",
        "Trainers cannot log attendance in MVP.",
      ],
    },
    {
      id: "admin",
      title: "4.3 Admin features",
      bullets: [
        "A1 Create Gym Org; A2/A2b staff invites (trainers unlimited; Admins capped).",
        "A3 Roster; A4 trainer assign (addon-gated); A5 desk attendance + logs.",
        "A6 Membership invites; A7 plan catalog BASE/ADDON + capability.",
        "A8/A8b/A19 Subscriptions, payment status, start override, addon attach.",
        "A9–A10b Renewals inbox + T-2 + unpaid daily nudge.",
        "A11–A13 Mini-CRM (A14 convert P1).",
        "A15 Offboard clears grants; A17 grant-gated Client-owned reads; A18 block check-in.",
      ],
    },
    {
      id: "flows-join",
      title: "5. Key flows — join & grants",
      steps: [
        "Admin creates membership invite (base ± addon, payment statuses) → Client inbox (email match / invited_user_id).",
        "Client accepts: blocked if already ACTIVE elsewhere; invite must be PENDING and not expired.",
        "Transaction: ACTIVE membership + snapshotted subscription lines + required profile grants + optional checklist grants — no Client-owned data copy.",
        "Base start: Admin override or first attendance; addon start: attach day.",
        "While ACTIVE, Client manages optional grants; required vitals stay sticky. Offboard → INACTIVE and all grants for that gym clear.",
      ],
    },
    {
      id: "flows-ops",
      title: "5. Key flows — desk, coaching, renewals",
      bullets: [
        "Attendance: Client self check-in or Admin desk mark; Trainer cannot log. Block check-in is manual safety valve.",
        "Payment status does not auto-lock access; entitlement follows dates. Unpaid nudge is Admin-facing.",
        "Coaching requires in-date TRAINER_COACHING addon; on expiry plans become read-only history.",
        "T-2 job reminds Client + Admins for base and addon lines; Admin inbox labels Base vs addon.",
        "Leads: capture → pipeline → follow-up; convert to prefilled membership invite (P1).",
        "Calories: NL/qty against owned FoodItem catalog; manual fallback; no barcode / third-party nutrition APIs.",
        "Health sync: Client-owned metrics; staff need WEARABLES (and/or PROGRESS for weight).",
      ],
    },
    {
      id: "billing",
      title: "5.13 Base + addons",
      bullets: [
        "Catalog plans: Admin name/duration/price; system kind BASE | ADDON; ADDON has capability (MVP: TRAINER_COACHING).",
        "Membership always has a base line; addon optional. Price/duration snapshotted on the subscription row.",
        "Independent start/end/payment per line; DB non-overlap (ADR-0004).",
        "Renewal = new row per period. No active addon → no new coaching writes.",
      ],
    },
    {
      id: "data",
      title: "6. Data ownership (high level)",
      paragraphs: [
        "Gym-owned: membership, invites, subscriptions, attendance, leads, plan catalog — staff access via affiliation + permissions.",
        "Client-owned: ClientProfile, ProgressLog, CalorieLog, WearableConnection/metrics, DietPlan/WorkoutPlan instances + PlanCompletion — staff access only with a live DataGrant (profile attributes or class grants).",
      ],
      bullets: [
        "Required on accept: DOB, HEIGHT, WEIGHT. Optional profile: GENDER, MEDICAL_NOTES. Classes: PROGRESS, CALORIES, WEARABLES, DIET_PLANS, WORKOUT_PLANS.",
        "Assigning trainer may edit plan definition without class grant; adherence needs the grant.",
      ],
    },
    {
      id: "integrations",
      title: "7–8. Integrations & notifications",
      bullets: [
        "Auth: email OTP (Supabase) + Google; Facebook out.",
        "Health: Apple HealthKit, Health Connect, Samsung Health — live read sync.",
        "Nutrition: owned FoodItem API only.",
        "Notifications: FCM/APNs + in-app + Admin web inbox. WhatsApp/SMS out of MVP.",
        "Matrix includes T-2 renewals, unpaid digest, trainer/plan assign, invites, lead follow-ups, check-in block.",
      ],
    },
    {
      id: "nfr",
      title: "9–11. NFRs, out of scope, success metrics",
      bullets: [
        "Privacy: Client-owned sensitive data; DPDP erasure path; gym tenancy for Gym-owned.",
        "Reliability priority: check-in and plan viewing over heavy reporting.",
        "English-only UI; showcase = production bar for OTP and health sync.",
        "Success: activation (invite accept), weekly check-in rate, plan adherence, renewal after T-2, lead convert rate, food-log catalog hit rate.",
      ],
    },
  ],
};
