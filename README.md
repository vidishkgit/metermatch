# MeterMatch

**Revenue-leakage detection for usage-based businesses.** MeterMatch reconciles what
a customer *should* have been billed against what they *were* billed, surfaces each
gap as a dollar-valued finding, and totals the recoverable revenue.

Built for the **H0: Hack the Zero Stack** hackathon — Next.js on Vercel + AWS
databases (DynamoDB + Aurora PostgreSQL Serverless v2 via the RDS Data API).

## What it does

A dependency-free reconciliation engine runs ~10 detectors over each account:
under-billed overage, expired discount still applied, missing price uplift after an
upgrade, FX-rate drift, over-applied credits, minimum-commitment shortfalls, failed
payments, and more. Each finding includes expected vs. billed, monthly/annual
recoverable, and a severity.

## Data sources

- **AWS live** — billing (plans, contracts, invoices) from Aurora PostgreSQL via the
  RDS Data API; usage events from DynamoDB.
- **CSV upload** — drop an accounts file; runs in the browser, drives the whole app.
- **PDF upload** — extracts an accounts table from a PDF and runs the same engine.
- **Stripe (live import)** — server-side pull of subscriptions, usage, and invoices,
  mapped into the reconciliation schema.

Whichever source is active drives every page (Dashboard, Findings, Accounts,
Finance) and the topbar, with a one-click "Back to live data" revert.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind · server actions · passwordless
email-OTP auth (AWS SES) · AWS SDK (DynamoDB, RDS Data API, SES, Secrets Manager).

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in values
npm run dev
```

Open http://localhost:3000. With `DATA_SOURCE=sample` the app runs on bundled demo
data and needs no AWS.

### Seed AWS (optional)

With AWS env vars set, load the sample dataset into Aurora + DynamoDB so a live scan
reproduces the verified `$331,807.92/yr` figure:

```bash
npm run seed:aws
```

## Environment variables

See `.env.local.example`. Set the same variables in your Vercel project settings.

| Variable | Purpose |
| --- | --- |
| `DATA_SOURCE` / `NEXT_PUBLIC_DATA_SOURCE` | `sample` or `aws` |
| `SCAN_PERIOD` | Billing period to scan (`YYYY-MM`) |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `DYNAMO_USAGE_TABLE`, `DYNAMO_AUTH_TABLE` | DynamoDB tables |
| `AURORA_CLUSTER_ARN`, `AURORA_SECRET_ARN`, `AURORA_DATABASE` | Aurora via Data API |
| `SESSION_SECRET`, `OTP_SECRET` | Auth signing secrets |
| `SES_FROM_EMAIL` | Verified SES sender (blank = log OTP to console) |

## Deploy

Push to GitHub, import the repo into Vercel, add the environment variables above,
and deploy. `.env.local` is git-ignored and never committed.
