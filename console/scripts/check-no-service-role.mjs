#!/usr/bin/env node
/**
 * Fail if console source accidentally references Supabase service role (must stay server/BFF only).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "src");
const needles = [/SERVICE_ROLE/i, /service_role/i];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

let bad = [];
for (const file of walk(root)) {
  const s = readFileSync(file, "utf8");
  for (const n of needles) {
    if (n.test(s)) bad.push({ file, pattern: n.source });
  }
}

if (bad.length) {
  console.error("Forbidden service_role reference in console/src:\n", bad);
  process.exit(1);
}
console.log("check-no-service-role: ok");
