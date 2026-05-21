var I = Object.defineProperty;
var w = (i, e, t) => e in i ? I(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var n = (i, e, t) => w(i, typeof e != "symbol" ? e + "" : e, t);
import { buildLimeCapabilityInvokeRequest as H } from "./capabilityContract.js";
import { toLimeCapabilityError as l } from "./capabilityErrors.js";
const m = "lime.agentApp.bridge", b = 1, q = 15e3, R = 5 * 6e4;
function a(i) {
  return typeof i == "object" && i !== null;
}
function p(i, e) {
  return Object.entries(e).forEach(([t, s]) => {
    s !== void 0 && (i[t] = s);
  }), i;
}
function h(i) {
  return typeof i == "string" && i.trim() ? i.trim() : void 0;
}
function E(i) {
  if (!a(i))
    return null;
  const e = a(i.theme) ? i.theme : i;
  if (!a(e))
    return null;
  const t = a(e.tokens) ? Object.fromEntries(
    Object.entries(e.tokens).filter(
      (c) => typeof c[0] == "string" && typeof c[1] == "string" && c[1].trim().length > 0
    )
  ) : void 0, s = {}, r = h(e.themeMode), o = h(e.effectiveThemeMode), d = h(e.colorSchemeId);
  return r && (s.themeMode = r), o && (s.effectiveThemeMode = o), d && (s.colorSchemeId = d), t && (s.tokens = t), s;
}
function T(i, e = {}) {
  const t = E(i);
  if (!t)
    return null;
  const r = (e.documentRef ?? (typeof document > "u" ? void 0 : document))?.documentElement;
  if (!r)
    return t;
  const o = e.allowedTokenPrefixes ?? [
    "--lime-",
    "--app-"
  ];
  for (const [d, c] of Object.entries(t.tokens ?? {}))
    o.some((g) => d.startsWith(g)) && r.style.setProperty(d, c);
  return t.themeMode && (r.dataset.limeTheme = t.themeMode), t.effectiveThemeMode && (r.dataset.limeThemeEffective = t.effectiveThemeMode, r.style.colorScheme = t.effectiveThemeMode === "dark" ? "dark" : "light"), t.colorSchemeId && (r.dataset.limeColorScheme = t.colorSchemeId), t;
}
function K(i, e = {}) {
  const t = (o) => {
    T(o, e);
  }, s = i.onHostSnapshot(t), r = i.onThemeUpdate(t);
  return i.getHostSnapshot().then((o) => {
    o.ok && t(o.value);
  }), () => {
    s(), r();
  };
}
function u(i) {
  if (i.ok)
    return i.value;
  const e = new Error(i.error.message);
  throw e.code = i.error.code, e.payload = i.error, e.capability = i.error.capability, e.method = i.error.method, e.requestId = i.error.requestId, e;
}
function M(i) {
  return a(i) && i.protocol === m && i.version === b && typeof i.type == "string" && typeof i.appId == "string" && (i.requestId === void 0 || typeof i.requestId == "string") && (i.entryKey === void 0 || typeof i.entryKey == "string");
}
function y(i, e) {
  if (a(i) && i.ok === !1)
    return {
      ok: !1,
      error: l(i.error ?? i, {
        appId: e.appId,
        entryKey: e.entryKey,
        capability: e.request.capability,
        method: e.request.method,
        requestId: e.request.requestId
      })
    };
  if (a(i) && i.ok === !0) {
    const t = Object.prototype.hasOwnProperty.call(i, "value") ? i.value : Object.prototype.hasOwnProperty.call(i, "result") ? i.result : void 0;
    return p(
      {
        ok: !0,
        value: t
      },
      {
        traceId: h(i.traceId),
        evidenceId: h(i.evidenceId)
      }
    );
  }
  return a(i) && Object.prototype.hasOwnProperty.call(i, "result") ? {
    ok: !0,
    value: i.result
  } : {
    ok: !0,
    value: i
  };
}
function f(i) {
  return p(
    {
      capability: i.capability,
      method: i.method
    },
    {
      input: i.args,
      idempotencyKey: i.idempotencyKey,
      expectedSchema: i.expectedSchema,
      provenance: i.provenance
    }
  );
}
class v {
  constructor(e) {
    n(this, "appId");
    n(this, "entryKey");
    n(this, "windowRef");
    n(this, "targetOrigin");
    n(this, "trustedHostOrigin");
    n(this, "requestTimeoutMs");
    n(this, "requestIdPrefix");
    n(this, "pendingRequests", /* @__PURE__ */ new Map());
    n(this, "subscriptionHandlers", /* @__PURE__ */ new Map());
    n(this, "snapshotHandlers", /* @__PURE__ */ new Set());
    n(this, "themeHandlers", /* @__PURE__ */ new Set());
    n(this, "visibilityHandlers", /* @__PURE__ */ new Set());
    n(this, "capabilityEventHandlers", /* @__PURE__ */ new Set());
    n(this, "callLog", []);
    n(this, "requestSequence", 0);
    n(this, "disposed", !1);
    n(this, "send", (e, t, s) => {
      this.postBridgeMessage(e, t, s);
    });
    n(this, "request", (e, t, s = {}) => {
      const r = this.buildHostActionContext(
        "lime.ui",
        e || "request",
        s.requestId
      );
      return this.requestBridgeAction(e, t, r, s).then(
        u
      );
    });
    n(this, "ready", () => {
      this.sendReady();
    });
    n(this, "getSnapshot", () => {
      this.postBridgeMessage("host:getSnapshot");
    });
    n(this, "getCallLog", () => [...this.callLog]);
    n(this, "handleHostMessage", (e) => {
      if (e.source !== this.windowRef?.parent || this.trustedHostOrigin && e.origin !== this.trustedHostOrigin || !M(e.data) || e.data.appId !== this.appId || this.entryKey && e.data.entryKey && e.data.entryKey !== this.entryKey)
        return;
      if (e.data.type === "host:snapshot") {
        a(e.data.payload) && a(e.data.payload.app) && (this.entryKey = h(e.data.payload.app.entryKey) ?? this.entryKey), this.dispatchHostEvent(this.snapshotHandlers, e.data.payload), e.data.requestId && this.settlePendingResponse(e.data.requestId, e.data.payload);
        return;
      }
      if (e.data.type === "theme:update") {
        this.dispatchHostEvent(this.themeHandlers, e.data.payload);
        return;
      }
      if (e.data.type === "host:visibility") {
        this.dispatchHostEvent(this.visibilityHandlers, e.data.payload);
        return;
      }
      if (e.data.type === "capability:event") {
        this.dispatchCapabilityEvent(e.data.payload);
        return;
      }
      if (e.data.type !== "host:response" && e.data.type !== "host:error")
        return;
      const t = e.data.requestId;
      if (!t)
        return;
      const s = this.pendingRequests.get(t);
      if (s) {
        if (this.windowRef?.clearTimeout(s.timerId), this.pendingRequests.delete(t), e.data.type === "host:error") {
          s.resolve({
            ok: !1,
            error: l(e.data.payload, {
              appId: this.appId,
              entryKey: this.entryKey,
              capability: s.request.capability,
              method: s.request.method,
              requestId: t
            })
          });
          return;
        }
        s.resolve(
          y(e.data.payload, {
            appId: this.appId,
            entryKey: this.entryKey,
            request: s.request
          })
        );
      }
    });
    this.appId = e.appId, this.entryKey = e.entryKey, this.windowRef = e.windowRef ?? e.hostWindow ?? (typeof window > "u" ? void 0 : window), this.targetOrigin = e.targetOrigin ?? e.trustedHostOrigin ?? "*", this.trustedHostOrigin = e.trustedHostOrigin, this.requestTimeoutMs = e.requestTimeoutMs ?? q, this.requestIdPrefix = e.requestIdPrefix ?? "lime-capability", e.onSnapshot && this.snapshotHandlers.add(e.onSnapshot), e.onTheme && this.themeHandlers.add(e.onTheme), e.onVisibility && this.visibilityHandlers.add(e.onVisibility), e.onCapabilityEvent && this.capabilityEventHandlers.add(e.onCapabilityEvent), this.windowRef?.addEventListener("message", this.handleHostMessage);
  }
  get pendingRequestCount() {
    return this.pendingRequests.size;
  }
  async call(e) {
    this.callLog.push({
      capability: e.capability,
      method: e.method,
      args: e.args
    });
    const t = {
      ...e,
      requestId: e.requestId ?? this.nextRequestId(e)
    };
    return this.requestBridgeAction(
      "capability:invoke",
      f(t),
      t
    );
  }
  sendReady() {
    this.postBridgeMessage("app:ready");
  }
  getHostSnapshot() {
    const e = this.buildHostActionContext("lime.ui", "getSnapshot");
    return this.requestBridgeAction("host:getSnapshot", void 0, e);
  }
  notifyHost(e, t) {
    const s = typeof e == "string" ? { message: e, level: t } : e, r = this.buildHostActionContext("lime.ui", "toast");
    return this.requestBridgeAction(
      "host:toast",
      s,
      r
    );
  }
  navigateHost(e) {
    const t = this.buildHostActionContext("lime.ui", "navigate");
    return this.requestBridgeAction(
      "host:navigate",
      e,
      t
    );
  }
  openExternalHost(e) {
    const t = this.buildHostActionContext("lime.ui", "openExternal");
    return this.requestBridgeAction(
      "host:openExternal",
      e,
      t
    );
  }
  selectDirectoryHost(e = {}, t = {}) {
    const s = {
      capability: "lime.ui",
      method: "selectDirectory",
      args: e,
      requestId: t.requestId ?? this.nextRequestId({
        capability: "lime.ui",
        method: "selectDirectory"
      })
    };
    return this.callLog.push({
      capability: s.capability,
      method: s.method,
      args: e
    }), this.requestBridgeAction(
      "capability:invoke",
      f(s),
      s,
      {
        ...t,
        timeoutMs: t.timeoutMs ?? R
      }
    );
  }
  downloadHost(e, t = {}) {
    const s = this.buildHostActionContext("lime.ui", "download");
    return this.requestBridgeAction(
      "host:download",
      e,
      s,
      t
    );
  }
  onHostSnapshot(e) {
    return this.snapshotHandlers.add(e), () => {
      this.snapshotHandlers.delete(e);
    };
  }
  onThemeUpdate(e) {
    return this.themeHandlers.add(e), () => {
      this.themeHandlers.delete(e);
    };
  }
  onVisibilityChange(e) {
    return this.visibilityHandlers.add(e), () => {
      this.visibilityHandlers.delete(e);
    };
  }
  onCapabilityEvent(e) {
    return this.capabilityEventHandlers.add(e), () => {
      this.capabilityEventHandlers.delete(e);
    };
  }
  invoke(e, t = {}) {
    return this.call(
      H({
        capability: e.capability,
        method: e.method,
        args: e.args,
        requestId: t.requestId,
        provenance: e.provenance
      })
    ).then(u);
  }
  subscribe(e, t = {}) {
    return this.subscribeCapability(e, void 0, t).then(
      u
    );
  }
  unsubscribe(e, t = {}) {
    return this.unsubscribeCapability(e, t).then(
      u
    );
  }
  async subscribeCapability(e, t, s = {}) {
    const r = {
      capability: e.capability,
      method: "subscribe",
      requestId: s.requestId ?? this.nextRequestId({
        capability: e.capability,
        method: "subscribe"
      })
    }, o = await this.requestBridgeAction(
      "capability:subscribe",
      p(
        {
          capability: e.capability,
          topic: e.topic
        },
        {
          input: e.input,
          subscriptionId: e.subscriptionId,
          pollIntervalMs: e.pollIntervalMs,
          bridgeAction: e.bridgeAction
        }
      ),
      r,
      s
    );
    if (o.ok && a(o.value)) {
      const d = h(o.value.subscriptionId);
      d && t && this.subscriptionHandlers.set(d, t);
    }
    return o;
  }
  async unsubscribeCapability(e, t = {}) {
    const s = {
      capability: "lime.agent",
      method: "unsubscribe",
      requestId: t.requestId ?? this.nextRequestId({
        capability: "lime.agent",
        method: "unsubscribe"
      })
    }, r = await this.requestBridgeAction(
      "capability:unsubscribe",
      { subscriptionId: e },
      s,
      t
    );
    return r.ok && this.subscriptionHandlers.delete(e), r;
  }
  download(e, t, s = {}) {
    return this.downloadHost({ url: e, fileName: t }, s).then(
      u
    );
  }
  requestBridgeAction(e, t, s, r = {}) {
    return this.disposed || !this.windowRef || this.windowRef.parent === this.windowRef.self ? Promise.resolve({
      ok: !1,
      error: this.buildError(
        "CAPABILITY_BLOCKED",
        "Lime host bridge is not connected.",
        s
      )
    }) : new Promise((o) => {
      const d = this.windowRef.setTimeout(() => {
        this.pendingRequests.delete(s.requestId), o({
          ok: !1,
          error: this.buildError(
            "TIMEOUT",
            "Lime host bridge request timed out.",
            s
          )
        });
      }, r.timeoutMs ?? this.requestTimeoutMs);
      this.pendingRequests.set(s.requestId, {
        request: s,
        resolve: o,
        timerId: d
      }), this.postBridgeMessage(e, t, s.requestId);
    });
  }
  dispose() {
    if (!this.disposed) {
      this.disposed = !0, this.windowRef?.removeEventListener("message", this.handleHostMessage);
      for (const e of this.pendingRequests.values())
        this.windowRef?.clearTimeout(e.timerId);
      this.pendingRequests.clear(), this.subscriptionHandlers.clear(), this.snapshotHandlers.clear(), this.themeHandlers.clear(), this.visibilityHandlers.clear();
    }
  }
  settlePendingResponse(e, t) {
    const s = this.pendingRequests.get(e);
    s && (this.windowRef?.clearTimeout(s.timerId), this.pendingRequests.delete(e), s.resolve(
      y(t, {
        appId: this.appId,
        entryKey: this.entryKey,
        request: s.request
      })
    ));
  }
  dispatchHostEvent(e, t) {
    for (const s of e)
      s(t);
  }
  dispatchCapabilityEvent(e) {
    if (!a(e))
      return;
    const t = h(e.subscriptionId), s = e;
    for (const o of this.capabilityEventHandlers)
      o(s);
    if (!t)
      return;
    const r = this.subscriptionHandlers.get(t);
    r && r(s);
  }
  postBridgeMessage(e, t, s) {
    this.disposed || !this.windowRef || this.windowRef.parent === this.windowRef.self || this.windowRef.parent.postMessage(
      this.buildMessage(e, t, s),
      this.targetOrigin
    );
  }
  buildMessage(e, t, s) {
    return {
      protocol: m,
      version: b,
      type: e,
      requestId: s,
      appId: this.appId,
      entryKey: this.entryKey,
      payload: t
    };
  }
  buildHostActionContext(e, t, s) {
    return {
      capability: e,
      method: t,
      requestId: s ?? this.nextRequestId({ capability: e, method: t })
    };
  }
  nextRequestId(e) {
    return this.requestSequence += 1, `${this.requestIdPrefix}-${this.requestSequence}-${e.capability}:${e.method}`;
  }
  buildError(e, t, s) {
    return l({
      code: e,
      message: t
    }, {
      appId: this.appId,
      entryKey: this.entryKey,
      capability: s.capability,
      method: s.method,
      requestId: s.requestId
    });
  }
}
function O(i) {
  return new v(i);
}
export {
  m as LIME_AGENT_APP_BRIDGE_PROTOCOL,
  b as LIME_AGENT_APP_BRIDGE_VERSION,
  T as applyLimeHostTheme,
  O as createLimeHostBridgeCapabilityInvoker,
  K as syncLimeHostTheme
};
