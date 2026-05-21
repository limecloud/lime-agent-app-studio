// input: LimeCore API base、tenantId、token 与发布包
// output: 开发者认证、上传包、创建 release 的 HTTP 调用

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const UPLOAD_REQUEST_TIMEOUT_MS = 120_000;

export async function getDeveloperProfile({ apiBase, tenantId, token }) {
  return unwrap(await requestJson(`${apiBase}/v1/public/tenants/${tenantId}/client/developer-profile`, { token }));
}

export async function applyDeveloperCertification({ apiBase, tenantId, token, displayName = "" }) {
  return unwrap(
    await requestJson(`${apiBase}/v1/public/tenants/${tenantId}/client/developer-profile/apply`, {
      token,
      method: "POST",
      body: { agreementAccepted: true, displayName },
    })
  );
}

export async function uploadDeveloperAgentAppPackage({ apiBase, tenantId, token, appId, packagePath }) {
  const data = await readFile(packagePath);
  const formData = new FormData();
  formData.append("file", new Blob([data], { type: "application/octet-stream" }), basename(packagePath));
  return unwrap(
    await requestRaw(`${apiBase}/v1/public/tenants/${tenantId}/client/developer/agent-apps/${encodeURIComponent(appId)}/package-upload`, {
      token,
      method: "POST",
      body: formData,
      timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
    })
  );
}

export async function createDeveloperAgentAppRelease({ apiBase, tenantId, token, appId, payload }) {
  return unwrap(
    await requestJson(`${apiBase}/v1/public/tenants/${tenantId}/client/developer/agent-apps/${encodeURIComponent(appId)}/releases`, {
      token,
      method: "POST",
      body: payload,
    })
  );
}

async function requestJson(url, options = {}) {
  return requestRaw(url, {
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}

async function requestRaw(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;
  try {
    response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body,
      signal: controller.signal,
    });
  } catch (cause) {
    if (timer) clearTimeout(timer);
    if (controller.signal.aborted) {
      const error = new Error(`请求 LimeCore API 超时（${Math.round(timeoutMs / 1000)}s）：${url}`);
      error.cause = cause;
      throw error;
    }
    const error = new Error(`无法连接 LimeCore API：${cause?.message || cause}`);
    error.cause = cause;
    throw error;
  }
  if (timer) clearTimeout(timer);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === "object" && payload ? payload.message || payload.error : payload;
    const error = new Error(`${response.status} ${message || response.statusText}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function unwrap(payload) {
  if (payload && typeof payload === "object" && "data" in payload) return payload.data;
  return payload;
}
