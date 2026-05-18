import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectProject } from "../src/core/project.mjs";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "lime-agent-app-studio-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "sample-app", version: "0.2.0", scripts: { build: "node -e 1", "validate:app": "node -e 1" } }));
  await writeFile(join(root, "APP.md"), "---\nmanifestVersion: 0.6.0\nname: sample-app\ndisplayName: Sample App\nversion: 0.2.0\nappType: developer-tool\ncategories:\n  - developer-tool\n  - workflow-tool\ndescription: Publish helper\n---\n# Sample\n");
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
  assert.equal(result.displayName, "Sample App");
  assert.equal(result.appType, "developer-tool");
  assert.deepEqual(result.categories, ["developer-tool", "workflow-tool"]);
  assert.equal(result.generated.displayName, "Sample App");
  assert.equal(result.generated.appTypeLabel, "开发者工具");
  assert.deepEqual(result.generated.icon, {
    kind: "monogram",
    label: "SA",
    background: "#145c72",
  });
});
