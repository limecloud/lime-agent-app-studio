const fields = ["appDir", "appId", "tenantId", "apiBase", "token", "channel"];
const output = document.querySelector("#output");
const statusEl = document.querySelector("#status");

function values() {
  return Object.fromEntries(fields.map((id) => [id, document.querySelector(`#${id}`).value.trim()]).filter(([, value]) => value));
}

async function post(path, body) {
  statusEl.textContent = "执行中";
  output.textContent = "请稍候...";
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  statusEl.textContent = response.ok ? "完成" : "失败";
  output.textContent = JSON.stringify(payload, null, 2);
}

document.querySelector("#inspectBtn").addEventListener("click", () => post("/api/inspect", values()));
document.querySelector("#dryRunBtn").addEventListener("click", () => post("/api/publish", { ...values(), dryRun: true }));
document.querySelector("#publishBtn").addEventListener("click", () => {
  if (!confirm("正式发布会写入 LimeCore 云端 Release，确认继续？")) return;
  post("/api/publish", { ...values(), publish: true });
});
