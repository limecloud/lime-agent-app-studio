var m = Object.defineProperty;
var n = (t, a, e) => a in t ? m(t, a, { enumerable: !0, configurable: !0, writable: !0, value: e }) : t[a] = e;
var p = (t, a, e) => n(t, typeof a != "symbol" ? a + "" : a, e);
import { buildLimeCapabilityInvokeRequest as d } from "./capabilityContract.js";
import { LIME_CAPABILITY_DEFINITIONS as u, getLimeCapabilityAdapterKey as h } from "./capabilityCatalog.js";
class y extends Error {
  constructor(e) {
    super(e.message);
    p(this, "error");
    p(this, "code");
    p(this, "causeCode");
    p(this, "capability");
    p(this, "method");
    p(this, "requestId");
    this.name = "LimeCapabilityAdapterError", this.error = e, this.code = e.code, this.causeCode = e.causeCode, this.capability = e.capability, this.method = e.method, this.requestId = e.requestId;
  }
}
const I = /* @__PURE__ */ new Set([
  "lime.ui.getSnapshot",
  "lime.storage.list",
  "lime.agent.listTasks",
  "lime.events.listSubscriptions",
  "lime.capabilities.list",
  "lime.capabilities.getProfile",
  "lime.mcp.listServers",
  "lime.workspace.getCurrent",
  "lime.workspace.list"
]);
async function b(t, a, e, r, c, s) {
  const i = await t.call(
    d({
      capability: e,
      method: r,
      args: c,
      requestId: s?.requestId,
      idempotencyKey: s?.idempotencyKey,
      expectedSchema: s?.expectedSchema,
      provenance: s?.provenance ?? a
    })
  );
  if (i.ok)
    return i.value;
  throw new y(i.error);
}
function C(t, a) {
  const e = {};
  return t.methods.forEach((r) => {
    const c = r, s = `${t.name}.${r}`;
    e[r] = (i, o) => I.has(s) ? a(
      t.name,
      c,
      void 0,
      i
    ) : a(
      t.name,
      c,
      i,
      o
    );
  }), e;
}
function E(t) {
  const { invoker: a, provenance: e } = t, r = (s, i, o, l) => b(a, e, s, i, o, l), c = {};
  return u.forEach((s) => {
    const i = C(s, r);
    c[h(s.name)] = s.name === "lime.storage" ? {
      namespace: t.storageNamespace ?? e?.appId ?? "agent_app",
      ...i
    } : i;
  }), c;
}
export {
  y as LimeCapabilityAdapterError,
  E as createLimeCoreCapabilityAdapters
};
