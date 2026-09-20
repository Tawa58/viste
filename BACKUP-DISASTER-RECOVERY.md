# BACKUP-DISASTER-RECOVERY.md — VISTE MGT

**Status:** `REQUIRES CONFIGURATION` — not claimed active until verified in Google Cloud

## Primary backup (required)

Use **Firestore managed backups** and/or **Point-in-Time Recovery (PITR)** on project `viste-school-db`.

### Recommended setup

1. Google Cloud Console → Firestore → Backup schedules  
   - Daily backup  
   - Retention ≥ 14–30 days  
2. Enable PITR for the production database (7-day window typical).  
3. Restrict who can restore (least privilege IAM).  
4. Store backups in a locked GCS bucket if using export jobs.

### Restore drill

1. Restore to a **non-production** database / project.  
2. Point a staging Admin SDK at the restored DB.  
3. Verify students, invoices, payments, marks, users.  
4. Document RTO/RPO after a real restore test.

**Restore testing:** `NOT YET VERIFIED`

## What is NOT a backup

- Browser `localStorage` / IndexedDB  
- Developer laptops  
- Manual JSON downloads as sole strategy  
- Git repository

## App-level complements

- `auditLogs` collection (append via Admin) — not a substitute for DB backups  
- Vercel redeploy restores **code**, not Firestore data

## Incident response (high level)

1. Revoke compromised Auth users / rotate service account keys.  
2. Temporarily tighten Firebase Auth & disable client file writes if needed.  
3. Restore Firestore from last known-good backup/PITR.  
4. Re-run fee/result integrity checks via Admin scripts.
