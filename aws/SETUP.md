# MeterMatch — AWS setup

Goal: stand up the two AWS databases the hackathon requires, seed them with the
sample data, and prove a live scan reproduces **$331,807.92/yr recoverable**.

- **DynamoDB** — raw usage events (high write volume).
- **Aurora PostgreSQL (Serverless v2)** — billing: plans, contracts, invoices, findings.
  Reached over the **RDS Data API** (HTTP) so it works from Vercel with no VPC.

Everything below is console-clickable. Region used in examples: `us-east-1`.

---

## 1. DynamoDB table

Console → DynamoDB → **Create table**.

- Table name: `metermatch_usage_events`
- Partition key: `accountId` (String)
- Sort key: `sk` (String)
- Capacity: On-demand

That's it. The seed script writes the items.

### 1b. Auth OTP table (optional, for real email sign-in)

Console → DynamoDB → **Create table**.

- Table name: `metermatch_auth_otps`
- Partition key: `email` (String)
- Capacity: On-demand

Then open the table → **Additional settings** → **Time to Live (TTL)** → enable on
the `expiresAt` attribute so expired codes auto-delete.

If you skip this table, auth still works via an in-memory fallback (fine for local
single-process dev). For production on Vercel (multiple serverless instances), create it.

---

## 2. Aurora PostgreSQL Serverless v2 + Data API

Console → RDS → **Create database**.

1. Engine: **Aurora (PostgreSQL-Compatible)**.
2. Template: Dev/Test. Capacity: **Serverless v2**, min 0.5 ACU.
3. Set a master username/password (remember them).
4. Initial database name: `metermatch`.
5. After it's created, open the cluster → **Modify** → enable **RDS Data API** →
   save & apply. (Or check "Enable the Data API" during creation.)

### 2a. Store the DB credentials in Secrets Manager
Console → Secrets Manager → **Store a new secret** → "Credentials for Amazon RDS database"
→ pick the cluster → save. Copy the **secret ARN**.

### 2b. Collect the two ARNs
- **Cluster ARN**: RDS → your cluster → Configuration tab →
  `arn:aws:rds:us-east-1:<acct>:cluster:<name>`
- **Secret ARN**: from step 2a.

---

## 3. IAM user for the app

Console → IAM → Users → **Create user** → programmatic access. Attach a policy with:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": ["dynamodb:Query","dynamodb:BatchWriteItem","dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:<acct>:table/metermatch_usage_events" },
    { "Effect": "Allow",
      "Action": ["dynamodb:GetItem","dynamodb:PutItem","dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:<acct>:table/metermatch_auth_otps" },
    { "Effect": "Allow",
      "Action": ["rds-data:ExecuteStatement","rds-data:BatchExecuteStatement"],
      "Resource": "<cluster ARN>" },
    { "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "<secret ARN>" },
    { "Effect": "Allow",
      "Action": ["ses:SendEmail"],
      "Resource": "*" }
  ]
}
```

Save the **Access key ID** and **Secret access key**.

---

## 4. Configure env + seed

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:
```
DATA_SOURCE=aws
SCAN_PERIOD=2026-05
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
DYNAMO_USAGE_TABLE=metermatch_usage_events
AURORA_CLUSTER_ARN=arn:aws:rds:us-east-1:<acct>:cluster:<name>
AURORA_SECRET_ARN=arn:aws:secretsmanager:us-east-1:<acct>:secret:<...>
AURORA_DATABASE=metermatch

# Auth (generate secrets with: openssl rand -base64 32)
SESSION_SECRET=<random-string>
OTP_SECRET=<random-string>
DYNAMO_AUTH_TABLE=metermatch_auth_otps
# Verified SES sender. Omit to print codes to the server console instead of emailing.
SES_FROM_EMAIL=login@yourdomain.com
```

> **SES note:** new SES accounts start in *sandbox* mode and can only send to
> verified addresses. Verify your sender (and any test recipient) under SES →
> Identities, or leave `SES_FROM_EMAIL` blank to use the dev console fallback.

Seed both databases:
```bash
npm install
npm run seed:aws
```
Expected output ends with: `Done. Set DATA_SOURCE=aws and run a scan to verify $331,807.92/yr.`

Verify locally:
```bash
npm run dev
```
Open the app → **Data Sources** → **Run Scan**. The headline should read **$331,807.92**.

---

## 5. Submission screenshots
- **DynamoDB**: table → Explore items, showing `metermatch_usage_events` rows.
- **Aurora**: RDS → cluster (status Available) **and** Query Editor running
  `SELECT count(*) FROM invoices;` (or `SELECT * FROM findings LIMIT 5;`).

Both screenshots prove the app uses AWS databases — required for the Devpost entry.

---

## Alternative: Aurora DSQL
If you'd rather use **Aurora DSQL** (also eligible), it's Postgres-wire-compatible
and serverless. You'd swap the Data API calls in `lib/aws/aurora.ts` for a `pg`
client using an IAM auth token. The schema in `aws/schema.sql` is unchanged.
Data API on Serverless v2 is the simpler path and is what the code ships with.
