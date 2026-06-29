// Shared AWS SDK clients. Credentials come from the standard AWS env vars
// (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION) — set them locally in
// .env.local and in the Vercel project settings.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { RDSDataClient } from "@aws-sdk/client-rds-data";

export const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";

// Usage events live in DynamoDB (high write volume, one row per metered event).
export const USAGE_TABLE = process.env.DYNAMO_USAGE_TABLE ?? "metermatch_usage_events";

// Billing (plans, contracts, invoices, findings) lives in Aurora PostgreSQL,
// reached over the RDS Data API (HTTP — no VPC/connection-pool headaches on Vercel).
export const AURORA_ARN = process.env.AURORA_CLUSTER_ARN ?? "";
export const AURORA_SECRET_ARN = process.env.AURORA_SECRET_ARN ?? "";
export const AURORA_DB = process.env.AURORA_DATABASE ?? "metermatch";

let _ddb: DynamoDBDocumentClient | null = null;
export function ddb(): DynamoDBDocumentClient {
  if (!_ddb) {
    _ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _ddb;
}

let _rds: RDSDataClient | null = null;
export function rds(): RDSDataClient {
  if (!_rds) _rds = new RDSDataClient({ region: AWS_REGION });
  return _rds;
}

export function awsConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID && AURORA_ARN && AURORA_SECRET_ARN
  );
}
