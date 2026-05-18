const fields = ["appDir", "appId", "tenantId", "apiBase", "token", "channel"];
const defaultApiBase = "https://lime-api.limeai.run/api";
const state = {
  inspection: null,
  generated: buildGeneratedAssets({}),
};

const output = document.querySelector("#output");
const statusEl = document.querySelector("#status");
const appDirInput = document.querySelector("#appDir");
const appIdInput = document.querySelector("#appId");
const publishBtn = document.querySelector("#publishBtn");
const dryRunBtn = document.querySelector("#dryRunBtn");
const inspectBtn = document.querySelector("#inspectBtn");
const logPanel = document.querySelector("#logPanel");
const advancedPanel = document.querySelector(".advanced-panel");
const stageSelect = document.querySelector("#stageSelect");
const stageGenerate = document.querySelector("#stageGenerate");
const stageUpload = document.querySelector("#stageUpload");
const limeAppSdkImport = "@lime/app-sdk";
const hostBridgeProtocol = "lime.agentApp.bridge";
const hostBridgeVersion = 1;
const appId = "lime-agent-app-studio";
const entryKey = "dashboard";
let limeAppSdkPromise = null;

function fieldValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function values() {
  return Object.fromEntries(
    fields
      .map((id) => [id, fieldValue(id)])
      .filter(([, value]) => value),
  );
}

function setBusy(label = "执行中") {
  setStatus(label, "idle");
  output.textContent = "请稍候...";
  publishBtn.disabled = true;
  dryRunBtn.disabled = true;
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

function render() {
  const inspection = state.inspection;
  const generated = state.generated;
  const hasDir = Boolean(fieldValue("appDir"));
  const publishable = Boolean(inspection?.publishable);
  const categoryLabels = inspection ? displayCategoryLabels(generated.categories) : ["自动分类"];
  const appName = inspection ? generated.name : "等待选择目录";
  const iconLabel = inspection ? generated.iconLabel : "App";
  const metaLabels = inspection
    ? unique([generated.typeLabel, ...categoryLabels.filter((item) => item !== generated.typeLabel)])
    : [];

  document.querySelector("#dirText").textContent = hasDir ? fieldValue("appDir") : "尚未选择";
  document.querySelector("#appTitle").textContent = appName;
  document.querySelector("#appMeta").textContent = inspection
    ? metaLabels.join(" · ")
    : "图标、类型和分类会自动生成。";
  document.querySelector("#autoIconState").textContent = inspection ? `${generated.iconLabel} 图标` : "自动生成";
  document.querySelector("#autoType").textContent = inspection ? generated.typeLabel : "自动推荐";
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
  dryRunBtn.disabled = !publishable;
  updateStages({ hasDir, inspection, publishable });

  document.querySelector("#activityText").textContent = state.manualDirectoryHint
    ? state.manualDirectoryHint
    : inspection
    ? publishable
      ? "已自动生成图标、类型和分类。现在可以一键上传或更新到云端。"
      : "目录已识别，但还有阻塞项。展开运行明细查看处理方式。"
    : "等待选择目录。选好后会自动生成图标、类型和分类。";
  document.querySelector("#nextStepTitle").textContent = state.manualDirectoryHint
    ? "粘贴目录后重新识别"
    : inspection
    ? publishable
      ? "一键发布到云端"
      : "先处理阻塞项"
    : "选择目录后即可发布";
  document.querySelector("#nextStepCopy").textContent = state.manualDirectoryHint
    ? "如果系统目录窗口没有弹出，直接把应用目录路径粘贴到高级设置里的“手动目录”。"
    : inspection
    ? publishable
      ? "默认使用本机开发者认证配置。需要改租户、Token 或通道时再展开高级设置。"
      : "缺少必需文件或发布信息时不会上传，按运行明细处理后重新识别。"
    : "Studio 默认读取本机开发者认证；需要覆盖时再展开高级设置。";
}

function updateStages({ hasDir, inspection, publishable }) {
  const stages = [stageSelect, stageGenerate, stageUpload];
  for (const item of stages) item.className = "stage";

  if (!hasDir && !inspection) {
    stageSelect.classList.add("active");
    return;
  }
  stageSelect.classList.add("done");
  if (!publishable) {
    stageGenerate.classList.add("active");
    return;
  }
  stageGenerate.classList.add("done");
  stageUpload.classList.add("active");
}

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || payload?.error) {
    const message = payload?.error || `HTTP ${response.status}`;
    const error = new Error(message);
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function inspectCurrent() {
  const appDir = fieldValue("appDir");
  if (!appDir) {
    state.inspection = null;
    state.generated = buildGeneratedAssets({});
    setStatus("等待目录", "idle");
    setOutput("请先选择应用目录。", { open: false });
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
    setOutput(formatInspectionResult(payload, state.generated), { open: !payload.publishable });
  } catch (error) {
    state.inspection = null;
    state.generated = buildGeneratedAssets({});
    setStatus("识别失败", "error");
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
      setOutput([
        "没有选择目录。",
        payload.message ? `系统提示：${payload.message}` : "你也可以展开高级设置，手动粘贴应用目录路径。",
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
  setOutput(
    [
      "已切换到手动目录模式。",
      "1. 把本地应用目录路径粘贴到“手动目录”。",
      "2. 点击“重新识别”。",
      "3. 识别通过后再一键上传或更新到云端。",
    ],
    { open: false },
  );
  window.setTimeout(() => appDirInput.focus(), 0);
}

async function dryRun() {
  setBusy("预演中");
  try {
    const payload = await post("/api/publish", { ...values(), dryRun: true });
    setStatus("预演完成", "ok");
    setOutput(formatPublishResult(payload), { open: true });
  } catch (error) {
    setStatus("预演失败", "error");
    setOutput(formatError(error), { open: true });
  } finally {
    render();
  }
}

async function publish() {
  setBusy("上传中");
  try {
    const payload = await post("/api/publish", { ...values(), publish: true });
    setStatus("上传完成", "ok");
    setOutput(formatPublishResult(payload), { open: true });
  } catch (error) {
    setStatus("上传失败", "error");
    setOutput(formatError(error), { open: true });
  } finally {
    render();
  }
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
  if (message.includes("token") || message.includes("tenantId") || message.includes("开发者认证")) {
    return [
      message,
      "",
      "处理方式：先在用户中心完成开发者认证；本机可通过 CLI 登录保存认证配置，或在高级设置中临时填写 Tenant ID 和开发者 Token。",
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
document.querySelector("#selectDirBtn").addEventListener("click", selectDirectory);
inspectBtn.addEventListener("click", inspectCurrent);
dryRunBtn.addEventListener("click", dryRun);
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
