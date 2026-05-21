const fields = ["appDir", "appId", "tenantId", "apiBase", "token", "channel"];
const defaultApiBase = "https://lime-api.limeai.run/api";
const state = {
  inspection: null,
  generated: buildGeneratedAssets({}),
  hostCloud: null,
};

const output = document.querySelector("#output");
const statusEl = document.querySelector("#status");
const appDirInput = document.querySelector("#appDir");
const appIdInput = document.querySelector("#appId");
const publishBtn = document.querySelector("#publishBtn");
const inspectBtn = document.querySelector("#inspectBtn");
const logPanel = document.querySelector("#logPanel");
const advancedPanel = document.querySelector(".advanced-panel");
const resultBanner = document.querySelector("#resultBanner");
const resultTitle = document.querySelector("#resultTitle");
const resultCopy = document.querySelector("#resultCopy");
const themeButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
const limeAppSdkImport = "@lime/app-sdk";
const hostBridgeProtocol = "lime.agentApp.bridge";
const hostBridgeVersion = 1;
const appId = "lime-agent-app-studio";
const entryKey = "dashboard";
const themeStorageKey = "lime-agent-app-studio:theme-mode";
let limeAppSdkPromise = null;
let selectedThemeMode = readStoredThemeMode();
let hostThemeSyncStarted = false;
const systemThemeMedia = window.matchMedia?.("(prefers-color-scheme: dark)");

applyThemeMode();
systemThemeMedia?.addEventListener?.("change", () => {
  if (selectedThemeMode === "system") applyThemeMode();
});

function fieldValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function buildExplicitValues() {
  const explicitValues = Object.fromEntries(
    fields
      .map((id) => [id, fieldValue(id)])
      .filter(([, value]) => value),
  );
  return explicitValues;
}

function values() {
  return {
    ...buildExplicitValues(),
    ...hostCloudAuthValues(),
  };
}

async function resolvePublishValues(options = {}) {
  return {
    ...values(),
    ...(await resolveHostCloudSessionValues(options)),
  };
}

function setBusy(label = "执行中") {
  setStatus(label, "idle");
  output.textContent = "请稍候...";
  setResultBanner(null);
  publishBtn.disabled = true;
  inspectBtn.disabled = true;
}

function setStatus(label, tone = "idle") {
  statusEl.textContent = label;
  statusEl.dataset.tone = tone;
}

function setOutput(lines, options = {}) {
  output.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
  if (Object.hasOwn(options, "open")) logPanel.open = Boolean(options.open);
}

function setResultBanner(result) {
  if (!result) {
    resultBanner.hidden = true;
    resultBanner.dataset.tone = "";
    resultTitle.textContent = "";
    resultCopy.textContent = "";
    return;
  }
  resultBanner.hidden = false;
  resultBanner.dataset.tone = result.tone || "info";
  resultTitle.textContent = result.title;
  resultCopy.textContent = result.copy || "";
}

function render() {
  const inspection = state.inspection;
  const generated = state.generated;
  const hasDir = Boolean(fieldValue("appDir"));
  const publishable = Boolean(inspection?.publishable);
  const categoryLabels = inspection ? displayCategoryLabels(generated.categories) : [];
  const appName = inspection ? generated.name : "等待选择目录";
  const iconLabel = inspection ? generated.iconLabel : "App";
  const metaLabels = inspection
    ? unique([generated.typeLabel, ...categoryLabels.filter((item) => item !== generated.typeLabel)])
    : [];

  document.querySelector("#dirText").textContent = hasDir ? fieldValue("appDir") : "尚未选择";
  document.querySelector("#appTitle").textContent = appName;
  document.querySelector("#appMeta").textContent = inspection
    ? metaLabels.join(" · ")
    : "选择目录后显示应用名称和类型。";
  document.querySelector("#iconPreview").textContent = iconLabel;
  document.querySelector("#iconPreview").style.setProperty("--icon-bg", generated.iconBackground);
  document.querySelector("#categoryChips").replaceChildren(
    ...categoryLabels.map((item) => {
      const chip = document.createElement("span");
      chip.textContent = item;
      return chip;
    }),
  );

  inspectBtn.disabled = !hasDir;
  publishBtn.disabled = !publishable;

  document.querySelector("#activityText").textContent = state.manualDirectoryHint
    ? state.manualDirectoryHint
    : inspection
    ? publishable
      ? "目录已通过检查，可以发布。"
      : "目录已识别，但还不能发布。"
    : "先选择应用目录。";
  document.querySelector("#nextStepTitle").textContent = state.manualDirectoryHint
    ? "粘贴目录后重新识别"
    : inspection
    ? publishable
      ? "准备发布"
      : "先处理阻塞项"
    : "选择目录后即可发布";
  document.querySelector("#nextStepCopy").textContent = state.manualDirectoryHint
    ? "在手动设置里粘贴目录路径，再重新识别。"
    : inspection
    ? publishable
      ? "发布会使用 Lime 当前登录状态。"
      : "查看诊断详情，修复后重新识别。"
    : "发布会使用 Lime 当前登录状态。";
}

async function post(path, body, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (cause) {
    const error = new Error(formatNetworkErrorMessage(cause));
    error.cause = cause;
    error.network = true;
    throw error;
  }
  let payload = null;
  let parseError = null;
  try {
    payload = await response.json();
  } catch (cause) {
    parseError = cause;
  }
  if (!response.ok || payload?.error) {
    const message = payload?.error || (parseError ? `HTTP ${response.status} (响应解析失败)` : `HTTP ${response.status}`);
    const error = new Error(message);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload;
}

function formatNetworkErrorMessage(cause) {
  const original = cause?.message || String(cause || "");
  const isLoadFailed = /load failed/i.test(original) || /failed to fetch/i.test(original);
  if (!isLoadFailed) return original || "请求 Studio 本地服务失败";
  return [
    "Studio 本地服务暂时不可达。",
    "可能原因：发布耗时超过浏览器请求上限；Studio runtime 已退出；端口被其他进程占用。",
    "处理方式：稍候再试；如多次失败，请到 Lime 应用中心 → 重新启动发布应用。",
  ].join("\n");
}

function hostCloudAuthValues() {
  const cloud = state.hostCloud;
  if (!cloud || !cloud.tenantId) {
    return {};
  }
  return {
    apiBase: cloud.controlPlaneBaseUrl || defaultApiBase,
    tenantId: cloud.tenantId,
  };
}

async function resolveHostCloudSessionValues(options = {}) {
  if (!isEmbeddedRuntime()) {
    return {};
  }
  const sdk = await loadLimeAppSdk();
  if (!sdk?.createLimeHostBridgeCapabilityInvoker) {
    return {};
  }
  const invoker = sdk.createLimeHostBridgeCapabilityInvoker({
    appId,
    entryKey,
    requestIdPrefix: "studio-host-cloud",
    requestTimeoutMs: 5 * 60 * 1000,
    onSnapshot: updateHostCloudFromSnapshot,
  });
  try {
    await syncHostCloudSnapshot(invoker);
    return await ensureHostCloudAccessToken(invoker, options);
  } finally {
    invoker.dispose?.();
  }
}

async function syncHostCloudSnapshot(invoker) {
  try {
    const response = await invoker.getHostSnapshot?.();
    updateHostCloudFromSnapshot(response?.value ?? response);
  } catch {
    // Host snapshot is best-effort; publish can still fall back to explicit auth.
  }
}

async function ensureHostCloudAccessToken(invoker, options = {}) {
  const request = buildHostCloudSessionRequest({
    capability: "lime.cloudSession",
    method: "getAccessToken",
  });
  if (options.forceLogin) {
    await requestHostCloudLogin(invoker, { force: true });
  }
  const response = await invoker.call(request);
  if (response.ok) {
    return normalizeHostCloudSessionValue(response.value);
  }

  await requestHostCloudLogin(invoker, { force: true });

  const retryResponse = await invoker.call(request);
  if (!retryResponse.ok) {
    throw new Error(readCapabilityErrorMessage(retryResponse));
  }
  return normalizeHostCloudSessionValue(retryResponse.value);
}

async function requestHostCloudLogin(invoker, input = {}) {
  const loginResponse = await invoker.call(
    buildHostCloudSessionRequest({
      capability: "lime.cloudSession",
      method: "requestLogin",
      input,
    }),
  );
  if (!loginResponse.ok) {
    throw new Error(readCapabilityErrorMessage(loginResponse));
  }
  return loginResponse.value;
}

function buildHostCloudSessionRequest({ capability, method, input }) {
  return {
    capability,
    method,
    ...(input && Object.keys(input).length ? { args: input } : {}),
  };
}

function normalizeHostCloudSessionValue(value) {
  if (!value || typeof value !== "object") {
    return {};
  }
  const token = firstText(value.accessToken, value.access_token, value.token);
  const tenantId = firstText(value.tenantId, value.tenant_id);
  const controlPlaneBaseUrl = firstText(
    value.controlPlaneBaseUrl,
    value.control_plane_base_url,
    value.apiBase,
    value.api_base,
  );
  if (!token || !tenantId) {
    return {};
  }
  return {
    token,
    tenantId,
    apiBase: controlPlaneBaseUrl || hostCloudAuthValues().apiBase || defaultApiBase,
  };
}

function readCapabilityErrorMessage(response) {
  if (response?.error?.message) return response.error.message;
  if (typeof response?.error === "string") return response.error;
  return "Host cloud session capability failed.";
}

function normalizeHostCloud(value) {
  if (!value || typeof value !== "object") return null;
  const cloud = value.cloud && typeof value.cloud === "object" ? value.cloud : value;
  const tenantId = firstText(cloud.tenantId, cloud.tenant_id);
  const controlPlaneBaseUrl = firstText(
    cloud.controlPlaneBaseUrl,
    cloud.control_plane_base_url,
    cloud.apiBase,
    cloud.api_base,
  );
  if (!tenantId && !controlPlaneBaseUrl && cloud.hasSession === undefined) return null;
  return {
    tenantId,
    controlPlaneBaseUrl,
    hasSession: Boolean(cloud.hasSession),
  };
}

function updateHostCloudFromSnapshot(snapshot) {
  const cloud = normalizeHostCloud(snapshot);
  if (!cloud) return false;
  state.hostCloud = cloud;
  return true;
}

function readStoredThemeMode() {
  const value = window.localStorage?.getItem(themeStorageKey);
  return ["system", "light", "dark"].includes(value) ? value : "system";
}

function setThemeMode(mode) {
  selectedThemeMode = ["system", "light", "dark"].includes(mode) ? mode : "system";
  window.localStorage?.setItem(themeStorageKey, selectedThemeMode);
  applyThemeMode();
}

function applyThemeMode() {
  const root = document.documentElement;
  const effectiveMode =
    selectedThemeMode === "system"
      ? root.dataset.limeThemeEffective || (systemThemeMedia?.matches ? "dark" : "light")
      : selectedThemeMode;
  root.dataset.studioTheme = selectedThemeMode;
  root.dataset.limeThemeEffective = effectiveMode;
  root.style.colorScheme = effectiveMode === "dark" ? "dark" : "light";
  for (const button of themeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.themeOption === selectedThemeMode));
  }
}

async function inspectCurrent() {
  const appDir = fieldValue("appDir");
  if (!appDir) {
    state.inspection = null;
    state.generated = buildGeneratedAssets({});
    setStatus("等待目录", "idle");
    setOutput("请先选择应用目录。", { open: false });
    setResultBanner(null);
    render();
    return;
  }

  setBusy("识别中");
  try {
    const payload = await post("/api/inspect", { appDir });
    state.inspection = payload;
    state.generated = buildGeneratedAssets(payload);
    state.manualDirectoryHint = null;
    if (payload.appId && !fieldValue("appId")) {
      appIdInput.value = payload.appId;
    }
    setStatus(payload.publishable ? "可以发布" : "需要处理", payload.publishable ? "ok" : "warn");
    setResultBanner(
      payload.publishable
        ? {
            tone: "ok",
            title: "已识别",
            copy: `${state.generated.name} 可以发布。`,
          }
        : {
            tone: "warn",
            title: "需要处理",
            copy: "修复诊断详情里的阻塞项后再发布。",
          },
    );
    setOutput(formatInspectionResult(payload, state.generated), { open: !payload.publishable });
  } catch (error) {
    state.inspection = null;
    state.generated = buildGeneratedAssets({});
    setStatus("识别失败", "error");
    setResultBanner({ tone: "error", title: "识别失败", copy: "查看诊断详情后重试。" });
    setOutput(formatError(error), { open: true });
  } finally {
    render();
  }
}

async function selectDirectory() {
  setBusy("等待选择");
  state.manualDirectoryHint = null;
  try {
    setOutput("系统目录选择器已打开，请选择包含 APP.md 的应用目录。");
    const payload = await selectDirectoryWithBestAvailablePicker();
    if (payload.cancelled || !payload.path) {
      setStatus("已取消", "idle");
      setResultBanner(null);
      setOutput([
        "没有选择目录。",
        payload.message ? `系统提示：${payload.message}` : "也可以展开手动设置，粘贴应用目录路径。",
      ], { open: Boolean(payload.message) });
      render();
      return;
    }
    if (isMockDirectoryPath(payload.path)) {
      throw new Error("Host returned a browser mock directory path.");
    }
    appDirInput.value = payload.path;
    await inspectCurrent();
  } catch (error) {
    openManualDirectoryFallback(error);
    render();
  }
}

async function selectDirectoryWithBestAvailablePicker() {
  if (isEmbeddedRuntime()) {
    return await selectDirectoryFromHostBridge();
  }
  const tauriCore = getTauriCore();
  if (tauriCore) {
    try {
      return await selectDirectoryFromTauriHost(tauriCore);
    } catch {
      // 旧宿主未提供 agent_app_select_directory 时，再回退到本地开发服务器。
    }
  }
  return post("/api/select-directory", {});
}

function isEmbeddedRuntime() {
  return window.parent !== window;
}

async function selectDirectoryFromHostBridge() {
  const sdk = await loadLimeAppSdk();
  if (!sdk?.createLimeHostBridgeCapabilityInvoker) {
    return selectDirectoryFromLegacyHostBridge();
  }

  const invoker = sdk.createLimeHostBridgeCapabilityInvoker({
    appId,
    entryKey,
    requestIdPrefix: "studio-select-directory",
    requestTimeoutMs: 5 * 60 * 1000,
  });
  try {
    const response = await invoker.selectDirectoryHost(
      { title: "选择应用目录" },
      { timeoutMs: 5 * 60 * 1000 },
    );
    if (response?.ok === false) {
      throw new Error(readHostBridgeErrorMessage(response));
    }
    return normalizeDirectoryPickerResult(response?.value ?? response);
  } finally {
    invoker.dispose?.();
  }
}

async function selectDirectoryFromTauriHost(tauriCore) {
  const result = await tauriCore.invoke("agent_app_select_directory", {
    request: { title: "选择应用目录" },
  });
  return normalizeDirectoryPickerResult(result);
}

function getTauriCore() {
  const tauri = window.__TAURI__;
  if (tauri?.core?.invoke) return tauri.core;
  if (tauri?.invoke) return tauri;
  return null;
}

function normalizeDirectoryPickerResult(result) {
  return {
    path: result?.path || null,
    cancelled: Boolean(result?.cancelled || !result?.path),
    message: result?.message,
  };
}

async function loadLimeAppSdk() {
  limeAppSdkPromise ??= import(limeAppSdkImport).catch(() => null);
  return limeAppSdkPromise;
}

async function syncHostCloudContext() {
  if (!isEmbeddedRuntime()) return;
  const sdk = await loadLimeAppSdk();
  if (!sdk?.createLimeHostBridgeCapabilityInvoker) return;
  void startHostThemeSync(sdk);
  const invoker = sdk.createLimeHostBridgeCapabilityInvoker({
    appId,
    entryKey,
    requestIdPrefix: "studio-host-cloud",
    requestTimeoutMs: 3000,
    onSnapshot: updateHostCloudFromSnapshot,
  });
  try {
    const response = await invoker.getHostSnapshot?.();
    updateHostCloudFromSnapshot(response?.value ?? response);
  } catch {
    // 没有 Host snapshot 时继续使用本机 CLI 配置或高级设置里的临时凭证。
  } finally {
    invoker.dispose?.();
  }
}

async function startHostThemeSync(sdk) {
  if (hostThemeSyncStarted || !sdk?.syncLimeHostTheme) return;
  hostThemeSyncStarted = true;
  const invoker = sdk.createLimeHostBridgeCapabilityInvoker({
    appId,
    entryKey,
    requestIdPrefix: "studio-theme",
    requestTimeoutMs: 3000,
  });
  sdk.syncLimeHostTheme(invoker);
}

function selectDirectoryFromLegacyHostBridge() {
  return invokeLegacyHostBridgeCapability(
    "selectDirectory",
    { title: "选择应用目录" },
    { timeoutMs: 5 * 60 * 1000 },
  );
}

function invokeLegacyHostBridgeCapability(method, input, options = {}) {
  if (!isEmbeddedRuntime()) {
    return Promise.reject(new Error("Host bridge is not available."));
  }

  const requestId = `studio-select-directory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Host bridge did not respond."));
    }, options.timeoutMs ?? 30 * 1000);

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    }

    function onMessage(event) {
      const message = event.data;
      if (
        !message ||
        message.protocol !== hostBridgeProtocol ||
        message.version !== hostBridgeVersion ||
        message.requestId !== requestId
      ) {
        return;
      }
      cleanup();
      if (message.type === "host:error" || message.payload?.ok === false) {
        reject(new Error(readHostBridgeErrorMessage(message.payload)));
        return;
      }
      const result = message.payload?.value ?? message.payload?.result ?? message.payload;
      resolve(result);
    }

    const payload = {
      capability: "lime.ui",
      method,
    };
    if (input !== undefined) {
      payload.input = input;
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage(
      {
        protocol: hostBridgeProtocol,
        version: hostBridgeVersion,
        type: "capability:invoke",
        requestId,
        appId,
        entryKey,
        payload,
      },
      "*",
    );
  });
}

function readHostBridgeErrorMessage(payload) {
  if (payload?.message) return payload.message;
  if (payload?.error?.message) return payload.error.message;
  if (typeof payload?.error === "string") return payload.error;
  return "Host bridge directory picker failed.";
}

function isMockDirectoryPath(value) {
  return /^[/\\]mock[/\\]path[/\\]to[/\\]/.test(String(value || ""));
}

function openManualDirectoryFallback() {
  state.manualDirectoryHint = "系统目录选择器暂不可用。已打开手动目录输入，粘贴目录后点击“重新识别”。";
  advancedPanel.open = true;
  setStatus("需要手动路径", "warn");
  setResultBanner({ tone: "warn", title: "需要手动选择", copy: "在手动设置里粘贴目录路径。" });
  setOutput(
    [
      "已切换到手动目录模式。",
      "1. 把本地应用目录路径粘贴到“手动目录”。",
      "2. 点击“重新识别”。",
      "3. 识别通过后再发布到云端。",
    ],
    { open: false },
  );
  window.setTimeout(() => appDirInput.focus(), 0);
}

async function publish() {
  setBusy("发布中");
  try {
    const payload = await post("/api/publish", { ...(await resolvePublishValues()), publish: true });
    setStatus("已发布", "ok");
    setResultBanner(buildPublishSuccessBanner(payload));
    setOutput(formatPublishResult(payload), { open: false });
  } catch (error) {
    if (isHostCloudAuthRefreshableError(error)) {
      try {
        setBusy("重新登录中");
        const payload = await post("/api/publish", {
          ...(await resolvePublishValues({ forceLogin: true })),
          publish: true,
        });
        setStatus("已发布", "ok");
        setResultBanner(buildPublishSuccessBanner(payload));
        setOutput(formatPublishResult(payload), { open: false });
        return;
      } catch (retryError) {
        setStatus("发布失败", "error");
        setResultBanner({ tone: "error", title: "发布失败", copy: "查看诊断详情后重试。" });
        setOutput(formatError(retryError), { open: true });
        return;
      }
    }
    setStatus("发布失败", "error");
    setResultBanner({ tone: "error", title: "发布失败", copy: "查看诊断详情后重试。" });
    setOutput(formatError(error), { open: true });
  } finally {
    render();
  }
}

function buildPublishSuccessBanner(payload) {
  const appName = payload.plan?.generated?.displayName || payload.plan?.appId || state.generated.name;
  const version = payload.publishedVersion || payload.release?.version || payload.plan?.version;
  return {
    tone: "ok",
    title: "已发布",
    copy: version ? `${appName} ${version} 已更新到云端。` : `${appName} 已更新到云端。`,
  };
}

function isHostCloudAuthRefreshableError(error) {
  if (!isEmbeddedRuntime()) return false;
  const message = error?.message || String(error || "");
  return (
    error?.status === 401 ||
    /\b401\b/.test(message) ||
    /无效的认证 token|当前 token 不是终端用户会话|session token 缺少 tenantId|token 与当前租户不匹配/i.test(message)
  );
}

function buildGeneratedAssets(inspection = {}) {
  const serverGenerated = inspection.generated || {};
  const serverIcon = serverGenerated.icon || {};
  const displayName = firstText(
    serverGenerated.displayName,
    inspection.displayName,
    inspection.name,
    inspection.packageName,
    inspection.appId,
    "Agent App",
  );
  const description = firstText(serverGenerated.description, inspection.description, "");
  const source = `${displayName} ${description} ${inspection.appId || ""}`.toLowerCase();
  const explicitType = firstText(inspection.appType, serverGenerated.appType, "");
  const inferredType = explicitType || inferType(source);
  const categories = unique([...(inspection.categories || []), ...(serverGenerated.categories || []), inferredType])
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 4);
  return {
    name: displayName,
    type: inferredType,
    typeLabel: firstText(serverGenerated.appTypeLabel, labelForType(inferredType)),
    categories: categories.length ? categories : ["workflow-tool"],
    iconLabel: firstText(serverIcon.label, monogram(displayName)),
    iconBackground: firstText(serverIcon.background, colorForText(displayName)),
  };
}

function inferType(source) {
  if (/content|article|post|copy|media|image|创作|内容|图片/.test(source)) return "content-tool";
  if (/deploy|publish|studio|developer|cli|release|开发|发布/.test(source)) return "developer-tool";
  if (/data|sheet|report|analysis|analytics|数据|报表/.test(source)) return "analytics-tool";
  if (/browser|crawl|search|research|采集|搜索|研究/.test(source)) return "research-tool";
  return "workflow-tool";
}

function labelForType(type) {
  return {
    developer: "开发者工具",
    developer_only: "开发者工具",
    tools: "开发者工具",
    "developer-tool": "开发者工具",
    content: "内容生产",
    media: "内容生产",
    "content-tool": "内容生产",
    analytics: "数据分析",
    data: "数据分析",
    "analytics-tool": "数据分析",
    research: "研究采集",
    "research-tool": "研究采集",
    workflow: "流程工具",
    "workflow-tool": "流程工具",
  }[type] || "应用工具";
}

function displayCategoryLabels(categories) {
  const labels = (categories || []).map((item) => labelForType(item));
  return unique(labels.length ? labels : ["自动分类"]);
}

function monogram(value) {
  const normalized = String(value || "App").trim();
  const chinese = normalized.match(/[\u4e00-\u9fa5]/);
  if (chinese) return chinese[0];
  const letters = normalized.match(/[A-Za-z0-9]/g) || ["A"];
  return letters.slice(0, 2).join("").toUpperCase();
}

function colorForText(value) {
  const colors = ["#2f8a54", "#145c72", "#16356f", "#8a5a23", "#6f7f3b"];
  const sum = String(value || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}

function formatInspectionResult(payload, generated) {
  const lines = [
    `已识别：${generated.name}`,
    `自动图标：${generated.iconLabel}`,
    `应用类型：${generated.typeLabel}`,
    `分类：${displayCategoryLabels(generated.categories).join("、")}`,
    `状态：${payload.publishable ? "可以发布" : "需要处理"}`,
  ];
  if (payload.issues?.length) {
    lines.push("", "阻塞项：", ...payload.issues.map((item) => `- ${item}`));
  }
  if (payload.warnings?.length) {
    lines.push("", "提醒：", ...payload.warnings.map((item) => `- ${item}`));
  }
  lines.push("", "技术明细：", `- App ID：${payload.appId || "未识别"}`, `- 版本：${payload.version || "未识别"}`);
  return lines;
}

function formatPublishResult(payload) {
  if (payload.mode === "dry-run") {
    return [
      "预演完成，未写入云端。",
      `应用：${payload.plan?.generated?.displayName || payload.plan?.appId || "-"}`,
      `类型：${payload.plan?.generated?.appTypeLabel || labelForType(payload.plan?.appType)}`,
      `通道：${payload.plan?.channel || "beta"}`,
      `状态：${payload.plan?.publishable ? "可以正式发布" : "需要处理"}`,
    ];
  }
  const publishedVersion = payload.publishedVersion || payload.release?.version || payload.plan?.version || "-";
  const lines = [
    payload.versionConflictResolved
      ? "上传完成，已自动发布为开发构建版本。"
      : "上传完成。",
    `应用：${payload.plan?.generated?.displayName || payload.plan?.appId || "-"}`,
    `版本：${publishedVersion}`,
    `Release：${payload.release?.releaseId || payload.release?.id || "已创建"}`,
  ];
  if (payload.versionConflictResolved && payload.originalVersion) {
    lines.splice(3, 0, `原版本：${payload.originalVersion} 已存在，Studio 已避免覆盖线上 release。`);
  }
  return lines;
}

function formatError(error) {
  const message = error?.message || String(error);
  if (error?.network) {
    return message;
  }
  if (/load failed/i.test(message) || /failed to fetch/i.test(message)) {
    return [
      message,
      "",
      "Studio 本地服务暂时不可达。请稍候再试；如多次失败，到 Lime 应用中心 → 重新启动发布应用。",
    ];
  }
  if (message.includes("token") || message.includes("tenantId") || message.includes("开发者认证")) {
    return [
      message,
      "",
      state.hostCloud?.hasSession
        ? "当前已同步宿主会话；Studio 会通过 `lime.cloudSession` 即时取 token。如果仍失败，请重新触发宿主登录或检查会话是否过期。"
        : "处理方式：先在 Lime 中完成登录，或在 CLI / 脱离宿主场景提供 Tenant ID 与 `LIME_AGENT_APP_STUDIO_TOKEN`。Studio 不会把 token 落盘。",
    ];
  }
  return message;
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

document.querySelector("#apiBase").placeholder = defaultApiBase;
void syncHostCloudContext();
for (const button of themeButtons) {
  button.addEventListener("click", () => setThemeMode(button.dataset.themeOption));
}
document.querySelector("#selectDirBtn").addEventListener("click", selectDirectory);
inspectBtn.addEventListener("click", inspectCurrent);
publishBtn.addEventListener("click", publish);
appDirInput.addEventListener("change", () => {
  state.manualDirectoryHint = null;
  if (fieldValue("appDir")) inspectCurrent();
});
appDirInput.addEventListener("input", () => {
  state.manualDirectoryHint = null;
  render();
});

setStatus("等待目录", "idle");
render();
