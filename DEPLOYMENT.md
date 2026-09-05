# BroStartup Sales OS — Production Deployment & Operational Guide

This guide details the complete production deployment, backup procedures, environment configuration, database management, and security protocols for **BroStartup Sales OS**.

---

## 1. System Requirements

- **Node.js**: v18.17.0 or higher (v20+ recommended)
- **Database**: PostgreSQL 14 or higher (or compatible managed service like AWS RDS, Supabase, Neon, Railway)
- **Storage**: S3-compatible Object Storage (AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces) for call recordings
- **Environment**: Linux / Unix / Windows Server environment supporting Next.js Node.js runtime

---

## 2. Environment Variables Specification

Create `.env.production` or configure these environment variables in your hosting provider's secret vault:

```env
# Database Connection (Required)
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<dbname>?schema=public&sslmode=require"

# Application Configuration (Required)
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Object Storage / Call Recordings (Optional in dev, Recommended for prod)
S3_ENDPOINT="https://s3.us-east-1.amazonaws.com"
S3_REGION="us-east-1"
S3_BUCKET="brostartup-salesos-recordings"
S3_ACCESS_KEY_ID="<your-access-key-id>"
S3_SECRET_ACCESS_KEY="<your-secret-access-key>"

# AI Intelligence Engine (Optional - degrades gracefully to fallback engines if not provided)
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4o-mini"

# WhatsApp Business API Integration (Optional)
WHATSAPP_API_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="1098..."
```

> [!IMPORTANT]
> **Security Rule**: Never prefix secret keys (`DATABASE_URL`, `OPENAI_API_KEY`, `S3_SECRET_ACCESS_KEY`, `WHATSAPP_API_TOKEN`) with `NEXT_PUBLIC_`. They must remain strictly server-side.

---

## 3. Database Migration & Deployment Strategy

To deploy schema updates without risking data loss or resetting database history:

### Standard Migration Command (Production Deployment)
```bash
npx prisma migrate deploy
```

> [!CAUTION]
> **CRITICAL WARNING**:
> - **NEVER** run `npx prisma db push --force-reset` in production.
> - **NEVER** run `npm run prisma:seed` on an active production database as it contains development mock data.

### Verification of Schema & Client Generation
```bash
npx prisma validate
npx prisma generate
```

---

## 4. Database Backup Architecture & Restore Procedure

### Backup Frequency & Retention Policy
- **Primary Automated Backups**: Daily at 02:00 UTC via `pg_dump` or hosting provider automated snapshots.
- **Retention**: Keep 7 daily backups, 4 weekly backups, and 12 monthly backups.
- **Off-Site Copy**: Copy database dumps to an isolated, encrypted S3 bucket or secondary storage location.

### Manual Backup Command (`pg_dump`)
```bash
pg_dump -h <host> -U <user> -d brostartup_sales_os -F c -b -v -f "./backups/salesos_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Step-by-Step Restore Procedure (Disaster Recovery)

1. **Verify Backup File Integrity**:
   Ensure the `.dump` file is intact and accessible.

2. **Prepare Target Database**:
   Create a fresh PostgreSQL database instance or target database:
   ```sql
   CREATE DATABASE brostartup_sales_os_restore;
   ```

3. **Execute Restore (`pg_restore`)**:
   ```bash
   pg_restore -h <host> -U <user> -d brostartup_sales_os_restore -v ./backups/salesos_backup_YYYYMMDD_HHMMSS.dump
   ```

4. **Verify Record Counts & Relational Integrity**:
   Run baseline checks to verify Leads, Calls, Demos, FollowUps, and CustomerMemory records match expectations.

5. **Update Production Connection String**:
   Update `DATABASE_URL` to point to the restored database and restart the application:
   ```bash
   npm run start
   ```

---

## 5. File & Call Recording Storage

In production, call recordings and uploaded documents must not rely on temporary local disk storage.

- **Storage Adapter**: Configure `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
- **Lifecycle Rules**: Set lifecycle policy on your S3 bucket to archive recordings older than 365 days to S3 Glacier/Infrequent Access to minimize storage overhead.

---

## 6. Production Build & Startup Commands

```bash
# 1. Install dependencies
npm ci --only=production

# 2. Validate Prisma Schema & Generate Client
npx prisma validate
npx prisma generate

# 3. Build Next.js Production Bundle
npm run build

# 4. Start Production Server
npm run start
```

---

## 7. Health Monitoring

The application includes an automated, lightweight health check endpoint at `/api/health`:

- **URL**: `GET /api/health`
- **Success Response (HTTP 200)**:
  ```json
  {
    "status": "ok",
    "app": "BroStartup Sales OS",
    "database": "connected",
    "timestamp": "2026-09-05T16:41:50.000Z",
    "latencyMs": 14
  }
  ```
- **Degraded Response (HTTP 503)**:
  ```json
  {
    "status": "degraded",
    "app": "BroStartup Sales OS",
    "database": "disconnected",
    "timestamp": "2026-09-05T16:41:50.000Z",
    "latencyMs": 5000
  }
  ```

---

## 8. Security Audit Checklist

- [x] All server secrets (`DATABASE_URL`, `OPENAI_API_KEY`, etc.) are hidden from client bundles.
- [x] `.env`, `.env*.local`, `.log`, and `/scratch` files are ignored in `.gitignore`.
- [x] CORS, CSP, and security headers are managed via Next.js standard headers.
- [x] API inputs are sanitized and validated with `zod` schemas and UUID format checks.
- [x] Sensitive stack trace dumps are suppressed in production error responses.

---

## 9. Pre-Deployment Checklist

- [ ] Node.js (v18+) and PostgreSQL instance provisioned.
- [ ] Environment variables configured in deployment secret store.
- [ ] Database credentials verified and reachable via SSL.
- [ ] Automated database backup cron / snapshot service enabled.
- [ ] Object storage bucket created with restricted permissions.
- [ ] `npx prisma migrate deploy` executed successfully.
- [ ] `npm run build` succeeds without compilation errors.

---

## 10. Post-Deployment Verification Checklist

- [ ] `/api/health` returns HTTP 200 with `database: "connected"`.
- [ ] Today Cockpit loads primary action card and priority schedule.
- [ ] Leads list loads correctly; Lead profile displays customer memory facts.
- [ ] Logging a call records entry and triggers background AI / deterministic analysis.
- [ ] Scheduling a Demo updates Demo Engine and timeline.
- [ ] Insights page displays sales pulse and conversion funnel metrics.
- [ ] WhatsApp campaign/message generator generates valid outbound messages.
- [ ] Lead CSV export downloads correctly formatted text.
