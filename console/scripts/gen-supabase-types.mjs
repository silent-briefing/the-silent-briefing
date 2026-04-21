#!/usr/bin/env node
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const consoleRoot = join(here, "..");
const repoRoot = join(consoleRoot, "..");
const out = execSync("supabase gen types typescript --local", {
  cwd: repoRoot,
  encoding: "utf8",
});
writeFileSync(join(consoleRoot, "src/lib/supabase/types.ts"), out, "utf8");
console.log("Wrote src/lib/supabase/types.ts");
