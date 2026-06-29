// Minimal .env.local loader (no dependency). Imported FIRST by seed-aws.ts so
// process.env is populated before lib/aws/clients.ts reads it at module load.
import { readFileSync } from "node:fs";

try {
  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
} catch {
  // no .env.local — rely on real environment variables
}
