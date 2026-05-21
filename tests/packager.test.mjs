import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectPackageFiles, packageProject } from "../src/core/packager.mjs";

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

test("collectPackageFiles 默认排除 node_modules，需要时可显式包含", async () => {
  const root = await createFixture();
  await mkdir(join(root, "node_modules", "runtime-dep"), { recursive: true });
  await writeFile(join(root, "node_modules", "runtime-dep", "index.js"), "export default true;");

  const defaultFiles = await collectPackageFiles(root);
  assert.equal(defaultFiles.some((file) => file.startsWith("node_modules/")), false);

  const runtimeFiles = await collectPackageFiles(root, { includeNodeModules: true });
  assert.equal(runtimeFiles.includes("node_modules/runtime-dep/index.js"), true);
});

test("collectPackageFiles 默认排除测试与原型大图目录", async () => {
  const root = await createFixture();
  await mkdir(join(root, "tests"), { recursive: true });
  await mkdir(join(root, "docs", "prototypes", "screens"), { recursive: true });
  await mkdir(join(root, ".github", "workflows"), { recursive: true });
  await writeFile(join(root, "tests", "ui.test.mjs"), "test");
  await writeFile(join(root, "docs", "prototypes", "screens", "contact-sheet.png"), "large");
  await writeFile(join(root, ".github", "workflows", "ci.yml"), "name: ci");
  await writeFile(join(root, "docs", "README.md"), "runtime docs");

  const files = await collectPackageFiles(root);
  assert.equal(files.includes("tests/ui.test.mjs"), false);
  assert.equal(files.includes("docs/prototypes/screens/contact-sheet.png"), false);
  assert.equal(files.includes(".github/workflows/ci.yml"), false);
  assert.equal(files.includes("docs/README.md"), true);
});
