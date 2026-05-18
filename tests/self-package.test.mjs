import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectProject } from "../src/core/project.mjs";
import { packageProject } from "../src/core/packager.mjs";

test("Studio 自身也是可发布的 Agent App", async () => {
  const root = resolve(".");
  const result = await inspectProject(root);
  assert.equal(result.appId, "lime-agent-app-studio");
  assert.equal(result.version, "0.1.1");
  assert.equal(result.manifestVersion, "0.7.0");
  assert.equal(result.publishable, true);
  assert.equal(result.files.appMd, true);
  assert.equal(result.files.capabilities, true);
  assert.equal(result.files.distUi, true);
  assert.equal(result.files.vendor, true);
});

test("Studio 自身可以生成 .lapp 云端安装包", async () => {
  const result = await packageProject({ appDir: "." });
  assert.equal(result.packageName, "lime-agent-app-studio-0.1.1.lapp");
  assert.match(result.packageHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.manifestHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok((await stat(result.packagePath)).size > 0);
});
