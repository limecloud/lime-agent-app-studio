// input: 环境变量、本机配置文件与 CLI 显式参数
// output: Studio API base、tenantId 与 token

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const defaultConfigDir = join(homedir(), ".lime", "agent-app-studio");
const defaultConfigPath = join(defaultConfigDir, "config.json");

export function resolveApiBase(options = {}) {
  return trimTrailingSlash(
    options.apiBase || process.env.LIMECORE_API_BASE_URL || "https://api.limecloud.run/api"
  );
}

export async function loadStudioConfig() {
  try {
    return JSON.parse(await readFile(defaultConfigPath, "utf8"));
  } catch (error) {
    return {};
  }
}

export async function saveStudioConfig(nextConfig) {
  const current = await loadStudioConfig();
  const merged = { ...current, ...nextConfig };
  await mkdir(defaultConfigDir, { recursive: true });
  await writeFile(defaultConfigPath, `${JSON.stringify(merged, null, 2)}\n`);
  return merged;
}

export async function resolveAuthContext(options = {}) {
  const config = await loadStudioConfig();
  return {
    apiBase: resolveApiBase(options.apiBase ? options : config),
    tenantId: options.tenantId || process.env.LIMECORE_TENANT_ID || config.tenantId || "",
    token: options.token || process.env.LIME_AGENT_APP_STUDIO_TOKEN || config.token || "",
  };
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}
