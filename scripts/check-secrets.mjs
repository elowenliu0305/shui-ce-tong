import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { scanText } from "./secret-scan-lib.mjs";

const roots = ["src", "scripts", "supabase/functions", "packages", "dist"];
const extensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".html", ".css", ".json", ".map"]);
const ignoredDirectories = new Set(["node_modules", "coverage", "test-results", "playwright-report"]);

function files(root) {
  if (!existsSync(root)) return [];
  if (!statSync(root).isDirectory()) return [root];

  return readdirSync(root).flatMap((name) => {
    if (ignoredDirectories.has(name)) return [];
    return files(join(root, name));
  });
}

const findings = roots.flatMap((root) =>
  files(root).flatMap((path) => {
    if (!extensions.has(extname(path))) return [];
    return scanText(readFileSync(path, "utf8"), relative(process.cwd(), path));
  }),
);

if (findings.length) {
  console.error(`Secret scan failed:\n${findings.map((finding) => `${finding.path}: ${finding.label}`).join("\n")}`);
  process.exit(1);
}

console.log("Secret scan passed: no embedded API keys, service-role keys, passwords, bearer tokens, or private keys found.");
