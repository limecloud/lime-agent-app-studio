// input: 本地项目、认证上下文与发布参数
// output: dry-run 计划或真实云端 release 结果

import { packageProject } from "./packager.mjs";
import { inspectProject } from "./project.mjs";
import {
  createDeveloperAgentAppRelease,
  getDeveloperProfile,
  uploadDeveloperAgentAppPackage,
} from "./api.mjs";

export async function buildPublishPlan(options = {}) {
  const inspection = await inspectProject(options.appDir || ".");
  const appId = options.appId || inspection.appId;
  const channel = options.channel || "beta";
  return {
    appDir: inspection.appDir,
    appId,
    version: options.version || inspection.version,
    manifestVersion: inspection.manifestVersion || "0.6.0",
    appType: inspection.appType,
    categories: inspection.categories,
    generated: inspection.generated,
    channel,
    publishable: inspection.publishable && Boolean(appId),
    issues: inspection.issues,
    warnings: inspection.warnings,
    apiBase: options.apiBase,
    tenantId: options.tenantId,
  };
}

export async function publishProject(options = {}) {
  const plan = await buildPublishPlan(options);
  if (!plan.publishable) {
    throw new Error(`发布计划不可执行：${plan.issues.join("；") || "缺少 appId"}`);
  }
  if (options.dryRun || !options.publish) {
    return { mode: "dry-run", plan };
  }
  if (!options.token) throw new Error("缺少开发者 token，请先执行 auth login 或设置 LIME_AGENT_APP_STUDIO_TOKEN");
  if (!options.tenantId) throw new Error("缺少 tenantId，请传入 --tenant-id 或设置 LIMECORE_TENANT_ID");

  const profile = await getDeveloperProfile(options);
  if (profile.status !== "approved") {
    throw new Error(`当前账号未完成开发者认证：${profile.status}`);
  }
  const packaged = await packageProject({
    appDir: options.appDir,
    outDir: options.outDir,
    includeNodeModules: Boolean(options.includeNodeModules),
  });
  const upload = await uploadDeveloperAgentAppPackage({ ...options, appId: plan.appId, packagePath: packaged.packagePath });
  const releasePayload = {
    version: options.version || upload.version || packaged.version,
    manifestVersion: upload.manifestVersion || packaged.manifestVersion || "0.6.0",
    channel: plan.channel,
    packageUrl: upload.packageUrl,
    packageHash: upload.packageHash,
    manifestHash: upload.manifestHash || packaged.manifestHash,
    signatureRef: upload.signatureRef,
    runtimeTargets: upload.runtimeTargets,
    capabilityRequirements: upload.capabilityRequirements || {},
    manifestSummary: {
      ...(upload.manifestSummary || {}),
      generated: plan.generated,
      appType: plan.appType,
      categories: plan.categories,
    },
    status: options.status || "ready",
  };
  const { release, versionConflictResolved, originalVersion } =
    await createReleaseWithDevelopmentVersionRetry({
      options,
      appId: plan.appId,
      payload: releasePayload,
    });
  return {
    mode: "publish",
    plan,
    profile,
    packaged,
    upload,
    release,
    versionConflictResolved,
    originalVersion,
    publishedVersion: release?.version || releasePayload.version,
  };
}

async function createReleaseWithDevelopmentVersionRetry({ options, appId, payload }) {
  try {
    const release = await createDeveloperAgentAppRelease({ ...options, appId, payload });
    return { release, versionConflictResolved: false, originalVersion: payload.version };
  } catch (error) {
    if (options.autoVersionOnConflict === false || !isReleaseAlreadyExistsError(error)) {
      throw error;
    }
    const retryPayload = {
      ...payload,
      version: buildConflictResolutionVersion(payload.version, options.now),
    };
    const release = await createDeveloperAgentAppRelease({ ...options, appId, payload: retryPayload });
    return { release, versionConflictResolved: true, originalVersion: payload.version };
  }
}

export function isReleaseAlreadyExistsError(error) {
  const message = String(error?.message || error || "");
  return (
    (error?.status === 400 || error?.status === 409 || /\b400\b|\b409\b/.test(message)) &&
    /agent app release already exists/i.test(message)
  );
}

export function buildConflictResolutionVersion(version, now = new Date()) {
  const baseVersion = String(version || "0.0.0").trim().replace(/\+.*/, "") || "0.0.0";
  const date = now instanceof Date ? now : new Date(now);
  const stamp = Number.isNaN(date.getTime())
    ? String(Date.now())
    : date.toISOString().replace(/\D/g, "").slice(0, 17);
  return `${baseVersion}+studio.${stamp}`;
}
