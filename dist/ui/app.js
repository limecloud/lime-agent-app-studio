const fields = ["appDir", "appId", "tenantId", "apiBase", "token", "channel"];
const output = document.querySelector("#output");
const statusEl = document.querySelector("#status");
const defaultApiBase = "https://lime-api.limeai.run/api";

function values() {
  return Object.fromEntries(fields.map((id) => [id, document.querySelector(`#${id}`).value.trim()]).filter(([, value]) => value));
}

async function post(path, body) {
  statusEl.textContent = "执行中";
  output.textContent = "请稍候...";
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    statusEl.textContent = response.ok ? "完成" : "失败";
    output.textContent = JSON.stringify(payload, null, 2);
  } catch (error) {
    statusEl.textContent = "需要本地服务";
    output.textContent = [
      "当前页面没有连接到本地 Studio 服务。",
      "",
      "如果你是在 Lime 应用中心里打开：",
      "1. 先安装 CLI：npm install -g @limecloud/agent-app-studio",
      "2. 启动本地可视化服务：lime-agent-app-studio studio --port 4177",
      `3. 默认 API Base：${defaultApiBase}`,
      "",
      `错误：${error?.message || String(error)}`,
    ].join("\n");
  }
}

document.querySelector("#apiBase").placeholder = defaultApiBase;
document.querySelector("#inspectBtn").addEventListener("click", () => post("/api/inspect", values()));
document.querySelector("#dryRunBtn").addEventListener("click", () => post("/api/publish", { ...values(), dryRun: true }));
document.querySelector("#publishBtn").addEventListener("click", () => {
  if (!confirm("正式发布会写入 LimeCore 云端 Release，确认继续？")) return;
  post("/api/publish", { ...values(), publish: true });
});
