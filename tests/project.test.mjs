import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectProject } from "../src/core/project.mjs";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "lime-agent-app-studio-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "sample-app", version: "0.2.0", scripts: { build: "node -e 1", "validate:app": "node -e 1" } }));
  await writeFile(join(root, "APP.md"), "---\nmanifestVersion: 0.6.0\nname: sample-app\nversion: 0.2.0\n---\n# Sample\n");
  await writeFile(join(root, "app.capabilities.yaml"), "entries: []\n");
  await mkdir(join(root, "dist", "ui", "vendor"), { recursive: true });
  await writeFile(join(root, "dist", "ui", "index.html"), "ok");
  return root;
}

test("inspectProject 识别 Agent App 发布关键信息", async () => {
  const root = await createFixture();
  const result = await inspectProject(root);
  assert.equal(result.appId, "sample-app");
  assert.equal(result.version, "0.2.0");
  assert.equal(result.manifestVersion, "0.6.0");
  assert.equal(result.publishable, true);
  assert.equal(result.files.vendor, true);
});
