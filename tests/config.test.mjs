import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const configSource = await readFile(
  new URL("../src/core/config.mjs", import.meta.url),
  "utf8",
);

test("resolveAuthContext 不再从本机配置读取 token", () => {
  assert.match(configSource, /token: options\.token \|\| process\.env\.LIME_AGENT_APP_STUDIO_TOKEN \|\| ""/);
  assert.match(configSource, /sanitizeStudioConfig/);
  assert.match(configSource, /loadStudioConfig\(\)\s*\{\s*try \{\s*return sanitizeStudioConfig/);
  assert.match(configSource, /saveStudioConfig\(nextConfig\)\s*\{\s*const current = await loadStudioConfig\(\);\s*const merged = sanitizeStudioConfig/);
  assert.doesNotMatch(configSource, /config\.token/);
});
