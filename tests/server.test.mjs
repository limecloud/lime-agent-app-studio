import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startStudioServer } from "../src/server.mjs";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "lime-agent-app-studio-server-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "server-app", version: "0.3.0" }));
  await writeFile(join(root, "APP.md"), "---\nmanifestVersion: 0.7.0\nname: server-app\nversion: 0.3.0\n---\n# Server App\n");
  await mkdir(join(root, "dist", "ui"), { recursive: true });
  await writeFile(join(root, "dist", "ui", "index.html"), "ok");
  return root;
}

async function withServer(callback, options = {}) {
  const { server, url } = await startStudioServer({ ...options, port: 0 });
  try {
    return await callback(url);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("Studio server 对缺失 favicon 返回 204 且服务不中断", async () => {
  const appDir = await createFixture();
  await withServer(async (url) => {
    const favicon = await fetch(`${url}/favicon.ico`);
    assert.equal(favicon.status, 204);

    const response = await fetch(`${url}/api/inspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appDir }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.appId, "server-app");
    assert.equal(payload.publishable, true);
  });
});

test("Studio server 对未知静态资源返回 404 而不是 500", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/missing.css`);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "Not Found");
  });
});

test("Studio server 暴露 Lime runtime 健康检查与页面路由回退", async () => {
  await withServer(async (url) => {
    const bootstrap = await fetch(`${url}/api/bootstrap`);
    assert.equal(bootstrap.status, 200);
    const payload = await bootstrap.json();
    assert.equal(payload.status, "ok");
    assert.equal(payload.appId, "lime-agent-app-studio");

    const dashboard = await fetch(`${url}/dashboard`, {
      headers: { Accept: "text/html" },
    });
    assert.equal(dashboard.status, 200);
    const html = await dashboard.text();
    assert.match(html, /<title>发布应用<\/title>/);
    assert.match(html, /<h1 id="pageTitle">发布应用<\/h1>/);
  });
});

test("Studio server 支持注入目录选择器", async () => {
  await withServer(
    async (url) => {
      const response = await fetch(`${url}/api/select-directory`, { method: "POST" });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { path: "/tmp/lime-app" });
    },
    {
      selectDirectory: async () => ({ path: "/tmp/lime-app" }),
    },
  );
});
