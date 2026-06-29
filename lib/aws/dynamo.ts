// DynamoDB: raw metered usage events -> per-account call totals for a period.
//
// Table design (single table):
//   PK  = accountId            (e.g. "acc_acme")
//   SK  = "<period>#<eventId>" (e.g. "2026-05#evt_000123")
//   attrs: metric (string), quantity (number), ts (ISO string)
//
// A period scan needs the SUM of quantity per account for that period. We Query
// per account by PK + SK begins_with(period). Accounts come from Aurora, so we
// know the small set of PKs to query (no full table scan).
import { QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, USAGE_TABLE } from "./clients";

/** Sum metered quantity for one account in one period. */
export async function usageForAccount(accountId: string, period: string): Promise<number> {
  const client = ddb();
  let total = 0;
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await client.send(
      new QueryCommand({
        TableName: USAGE_TABLE,
        KeyConditionExpression: "accountId = :a AND begins_with(sk, :p)",
        ExpressionAttributeValues: { ":a": accountId, ":p": `${period}#` },
        ProjectionExpression: "quantity",
        ExclusiveStartKey: lastKey as never,
      })
    );
    for (const item of res.Items ?? []) total += Number(item.quantity ?? 0);
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return total;
}

/** Usage totals for many accounts at once. */
export async function usageForAccounts(
  accountIds: string[],
  period: string
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    accountIds.map(async (id) => {
      out[id] = await usageForAccount(id, period);
    })
  );
  return out;
}

export interface UsageEvent {
  accountId: string;
  period: string;
  eventId: string;
  metric: string;
  quantity: number;
  ts: string;
}

/** Bulk-write usage events (used by the seed script). */
export async function putUsageEvents(events: UsageEvent[]): Promise<void> {
  const client = ddb();
  for (let i = 0; i < events.length; i += 25) {
    const chunk = events.slice(i, i + 25);
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [USAGE_TABLE]: chunk.map((e) => ({
            PutRequest: {
              Item: {
                accountId: e.accountId,
                sk: `${e.period}#${e.eventId}`,
                metric: e.metric,
                quantity: e.quantity,
                ts: e.ts,
              },
            },
          })),
        },
      })
    );
  }
}
