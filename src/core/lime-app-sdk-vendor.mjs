// input: Studio 根目录和浏览器 vendor 请求路径
// output: 可用于本地开发或发布包的 @lime/app-sdk 静态文件位置

import { access, cp, mkdir } from "node:fs/promises";
import { join, normalize, resolve, sep } from "node:path";

export const LIME_APP_SDK_PUBLIC_PREFIX = "/vendor/lime-app-sdk/";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function candidateSdkDistPaths(root) {
  const envPath = process.env.LIME_APP_SDK_DIST?.trim();
  return [
    envPath,
    join(root, "node_modules", "@lime", "app-sdk", "dist"),
    join(root, "node_modules", "@limecloud", "agent-app-runtime", "dist"),
    join(root, "..", "..", "aiclientproxy", "lime", "packages", "agent-app-runtime", "dist"),
    join(root, "..", "lime", "packages", "agent-app-runtime", "dist"),
  ].filter(Boolean);
}

export async function resolveLimeAppSdkDist(root) {
  for (const candidate of candidateSdkDistPaths(root)) {
    const distPath = resolve(candidate);
    if (await exists(join(distPath, "index.js"))) {
      return distPath;
    }
  }
  return null;
}

export async function copyLimeAppSdkVendor(root, targetDir, options = {}) {
  const sourceDir = await resolveLimeAppSdkDist(root);
  if (!sourceDir) {
    if (options.required !== false) {
      throw new Error(
        "未找到 @lime/app-sdk dist。请先 npm install，或设置 LIME_APP_SDK_DIST 指向本地 SDK dist。",
      );
    }
    await mkdir(targetDir, { recursive: true });
    return { copied: false, sourceDir: null };
  }

  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true, force: true });
  return { copied: true, sourceDir };
}

export async function resolveLimeAppSdkVendorFile(root, pathname) {
  if (!pathname.startsWith(LIME_APP_SDK_PUBLIC_PREFIX)) {
    return null;
  }
  const sourceDir = await resolveLimeAppSdkDist(root);
  if (!sourceDir) {
    return null;
  }

  const rawRelativePath =
    pathname.slice(LIME_APP_SDK_PUBLIC_PREFIX.length) || "index.js";
  const relativePath = normalize(rawRelativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = resolve(sourceDir, relativePath);
  const sourceRoot = resolve(sourceDir);
  if (filePath !== sourceRoot && !filePath.startsWith(`${sourceRoot}${sep}`)) {
    return null;
  }
  return filePath;
}
