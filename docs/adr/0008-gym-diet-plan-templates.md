# Gym diet plan templates (trainer-owned)

**Status:** accepted

Reusable diet structure lives in a gym-owned template library, authored by a Trainer (or Admin-as-Trainer) at that gym. Assigning a template **copies** meals onto a Client-owned `DietPlan` instance (snapshot). Assigned `diet_plans.client_user_id` stays required — templates are a separate table, not nullable-client plan rows.

PRD T7 originally said “duplicate a plan onto another client.” That is superseded: trainers save gym templates, duplicate those templates, then assign a copy to a client. Client-to-client clone without a template stays out of this stint.

## Why

Desk PT reuses the same cut/bulk meals across members. Authoring only on the client assign call means every reuse is a copy-paste. A gym library with trainer ownership matches “based on gym” without mixing `GymOwnedRecord` and `ClientOwnedRecord` in `diet_plans` (ADR-0002).

## Rules

- **`DietPlanTemplate`**: Gym-owned (`gym_org_id`). `trainer_id` is the authoring live trainer profile at that gym — not a data owner that replaces the gym.
- **Visibility:** Trainer lists/edits/duplicates **their** templates. Admin-as-Trainer lists **all** templates at the gym and may mutate any; duplicating creates a copy owned by the **duplicator’s** trainer profile.
- **Assign:** in-date `TRAINER_COACHING` on the **target client** (unchanged). Load template via the command repository; copy meals with **new** item ids; set `diet_plans.cloned_from_template_id`. Prior ACTIVE instance at that gym is archived.
- **Snapshot:** later template edits do not rewrite assigned instances.
- **Ad-hoc assign** (meals body on `POST .../diet-plans`) remains; XOR with `templateId`.
- Creating/duplicating a template does **not** require a client or coaching addon. Seed catalog servings still must match.
- Workout templates, cross-gym share, and client-to-client clone without a template are out.

## Ownership / modules

`coaching` owns templates and assigned diet instances. `DietPlanTemplateId` stays in `src/features/coaching/domain/` until a second unrelated feature persists it (H9). Completing a diet item still writes the Client diary (ADR-0006) against **instance** meal item ids.

## Considered options

- **Nullable `diet_plans.client_user_id` for templates** — rejected: mixes Gym-owned and Client-owned in one table; erasure/grants/RLS become ambiguous.
- **Gym-wide library with no trainer owner** — rejected: product choice is trainer-owned at the gym; Admin still sees all.
- **Assign-from-template only (drop meals body)** — rejected: T5 one-off assign is already shipped; keep XOR.

Downstream schema: `docs/schema.dbml`, migration `20260817102811_diet_plan_templates.sql`.
