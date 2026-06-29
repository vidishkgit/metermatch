// One-time passcodes. Stored hashed in DynamoDB with a TTL when AWS is configured,
// otherwise in an in-memory map (fine for local single-process dev).
import crypto from "node:crypto";
import { PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../aws/clients";

const TABLE = process.env.DYNAMO_AUTH_TABLE ?? "metermatch_auth_otps";
const TTL_SEC = 10 * 60; // 10 minutes
const MAX_ATTEMPTS = 5;

function useDynamo(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.DYNAMO_AUTH_TABLE);
}

export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(code: string): string {
  const secret = process.env.OTP_SECRET ?? "dev-otp-secret";
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

// --- in-memory fallback ---
type MemRecord = { hash: string; expires: number; attempts: number };
const mem = new Map<string, MemRecord>();

export async function storeOtp(email: string, code: string): Promise<void> {
  const hash = hashCode(code);
  const expires = Math.floor(Date.now() / 1000) + TTL_SEC;
  if (useDynamo()) {
    await ddb().send(
      new PutCommand({
        TableName: TABLE,
        Item: { email, codeHash: hash, expiresAt: expires, attempts: 0 },
      })
    );
  } else {
    mem.set(email, { hash, expires, attempts: 0 });
  }
}

export async function checkOtp(email: string, code: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const wanted = hashCode(code);

  if (useDynamo()) {
    const res = await ddb().send(new GetCommand({ TableName: TABLE, Key: { email } }));
    const item = res.Item;
    if (!item) return false;
    if (Number(item.expiresAt) < now) {
      await ddb().send(new DeleteCommand({ TableName: TABLE, Key: { email } }));
      return false;
    }
    if (Number(item.attempts) >= MAX_ATTEMPTS) return false;
    if (item.codeHash !== wanted) {
      await ddb().send(
        new PutCommand({
          TableName: TABLE,
          Item: { ...item, attempts: Number(item.attempts) + 1 },
        })
      );
      return false;
    }
    await ddb().send(new DeleteCommand({ TableName: TABLE, Key: { email } }));
    return true;
  }

  const rec = mem.get(email);
  if (!rec) return false;
  if (rec.expires < now) {
    mem.delete(email);
    return false;
  }
  if (rec.attempts >= MAX_ATTEMPTS) return false;
  if (rec.hash !== wanted) {
    rec.attempts += 1;
    return false;
  }
  mem.delete(email);
  return true;
}
