import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createReleaseWithDevelopmentVersionRetry,
  isReleaseAlreadyExistsError,
  publishProject,
} from "../src/core/publisher.mjs";

async function createPublishFixture() {
  const root = await mkdtemp(join(tmpdir(), "lime-agent-app-studio-publish-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "studio-local-app", version: "0.4.0" }),
  );
  await writeFile(
    join(root, "APP.md"),
    [
      "---",
      "manifestVersion: 0.7.0",
      "name: studio-local-app",
      "displayName: Studio Local App",
      "version: 0.4.0",
      "appType: agent-app",
      "categories:",
      "  - developer-tool",
      "---",
      "# Studio Local App",
      "",
    ].join("\n"),
  );
  await mkdir(join(root, "dist", "ui"), { recursive: true });
  await writeFile(join(root, "dist", "ui", "index.html"), "ok");
  return root;
}

async function withMockControlPlane(callback) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const path = new URL(req.url, "http://127.0.0.1").pathname;
    calls.push({ method: req.method, path, bodyLength: body.length });

    if (req.method === "GET" && path === "/v1/public/tenants/tenant-0001/client/developer-profile") {
      return sendJson(res, 200, { data: { status: "approved" } });
    }
    if (
      req.method === "POST" &&
      path === "/v1/public/tenants/tenant-0001/client/developer/agent-apps/studio-local-app/package-upload"
    ) {
      assert.ok(body.length > 0);
      return sendJson(res, 200, {
        data: {
          appId: "studio-local-app",
          version: "0.4.0",
          manifestVersion: "0.7.0",
          packageUrl: "https://packages.limecloud.example/agent-apps/studio-local-app/studio-local-app-0.4.0.lapp",
          packageHash: "sha256:" + "a".repeat(64),
          manifestHash: "sha256:" + "b".repeat(64),
          signatureRef: "",
          runtimeTargets: ["local"],
          capabilityRequirements: { "lime.ui": "^0.7.0" },
          manifestSummary: { displayName: "Studio Local App" },
        },
      });
    }
    if (
      req.method === "POST" &&
      path === "/v1/public/tenants/tenant-0001/client/developer/agent-apps/studio-local-app/releases"
    ) {
      const payload = JSON.parse(body.toString("utf8"));
      calls.at(-1).payload = payload;
      return sendJson(res, 200, {
        data: {
          releaseId: "agent-app-release-local",
          appId: "studio-local-app",
          version: payload.version,
          status: payload.status,
          packageUrl: payload.packageUrl,
          packageHash: payload.packageHash,
          manifestHash: payload.manifestHash,
        },
      });
    }
    sendJson(res, 404, { error: `${req.method} ${path} not mocked` });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    return await callback(`http://127.0.0.1:${address.port}`, calls);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

test("识别 LimeCore release 已存在错误", () => {
  const badRequest = new Error("400 agent app release already exists");
  badRequest.status = 400;
  assert.equal(isReleaseAlreadyExistsError(badRequest), true);

  const conflict = new Error("409 agent app release already exists");
  conflict.status = 409;
  assert.equal(isReleaseAlreadyExistsError(conflict), true);

  const unrelated = new Error("400 validation failed");
  unrelated.status = 400;
  assert.equal(isReleaseAlreadyExistsError(unrelated), false);
});

test("重复 release 冲突要求先更新包内 manifest version", async () => {
  const apiError = new Error("409 agent app release already exists");
  apiError.status = 409;

  await assert.rejects(
    createReleaseWithDevelopmentVersionRetry({
      options: {
        createDeveloperAgentAppRelease: async () => {
          throw apiError;
        },
      },
      appId: "removebg",
      payload: {
        version: "0.1.5",
      },
    }),
    /请先更新 APP\.md 或 app\.manifest\.json 中的 version/,
  );
});

test("正式发布使用本地打包上传返回的 packageUrl 创建 release", async () => {
  const appDir = await createPublishFixture();

  await withMockControlPlane(async (apiBase, calls) => {
    const result = await publishProject({
      appDir,
      apiBase,
      tenantId: "tenant-0001",
      token: "developer-token",
      publish: true,
      channel: "beta",
    });

    const releaseCall = calls.find((call) => call.path.endsWith("/releases"));
    assert.ok(releaseCall);
    assert.equal(result.upload.packageUrl, "https://packages.limecloud.example/agent-apps/studio-local-app/studio-local-app-0.4.0.lapp");
    assert.equal(releaseCall.payload.packageUrl, result.upload.packageUrl);
    assert.equal(releaseCall.payload.packageHash, result.upload.packageHash);
    assert.equal(releaseCall.payload.manifestHash, result.upload.manifestHash);
    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        "GET /v1/public/tenants/tenant-0001/client/developer-profile",
        "POST /v1/public/tenants/tenant-0001/client/developer/agent-apps/studio-local-app/package-upload",
        "POST /v1/public/tenants/tenant-0001/client/developer/agent-apps/studio-local-app/releases",
      ],
    );
  });
});
