# DPDP erasure procedure

**Status:** accepted

Normal mutation uses soft delete (`deleted_at`). India DPDP erasure is a separate privileged path: hard-delete (or irreversible anonymize) all `ClientOwnedRecord`s and `DataGrant`s; retain gym ops/billing `GymOwnedRecord`s with personal pointers anonymized (including `Attendance`); retain `audit_logs` with subject/actor scrubbed to a tombstone; then delete auth/`users`. Offboarding (`INACTIVE`) only clears grants — it is not erasure.

We accept that “no hard deletes in app code” does not apply to this procedure. Purging membership, subscription, and attendance history on erasure was rejected because the gym would lose its operational and accounting record.

## Considered Options

- **Purge all gym history with the user** — rejected: destroys billing and attendance ledgers the tenant needs.
- **Soft-delete only (hide everywhere)** — rejected for MVP DPDP posture: not a true erasure story.
