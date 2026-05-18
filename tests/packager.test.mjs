import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageProject } from "../src/core/packager.mjs";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "lime-agent-app-studio-pack-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "pack-app", version: "1.0.0" }));
  await writeFile(join(root, "APP.md"), "---\nname: pack-app\nversion: 1.0.0\n---\n# Pack\n");
  await mkdir(join(root, "dist"), { recursive: true });
  await writeFile(join(root, "dist", "index.html"), "ok");
  return root;
}

test("packageProject 生成 .lapp 与 sha256", async () => {
  const root = await createFixture();
  const result = await packageProject({ appDir: root });
  assert.equal(result.packageName, "pack-app-1.0.0.lapp");
  assert.match(result.packageHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.manifestHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok((await stat(result.packagePath)).size > 0);
});
