var f = Object.defineProperty;
var m = (i, t, e) => t in i ? f(i, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : i[t] = e;
var r = (i, t, e) => m(i, typeof t != "symbol" ? t + "" : t, e);
import { buildLimeCapabilityInvokeRequest as I } from "./capabilityContract.js";
import { toLimeCapabilityError as c } from "./capabilityErrors.js";
const b = "lime.agentApp.bridge", g = 1, q = 15e3, w = 5 * 6e4;
function d(i) {
  return typeof i == "object" && i !== null;
}
function l(i, t) {
  return Object.entries(t).forEach(([e, s]) => {
    s !== void 0 && (i[e] = s);
  }), i;
}
function u(i) {
  return typeof i == "string" && i.trim() ? i.trim() : void 0;
}
function o(i) {
  if (i.ok)
    return i.value;
  const t = new Error(i.error.message);
  throw t.code = i.error.code, t.payload = i.error, t.capability = i.error.capability, t.method = i.error.method, t.requestId = i.error.requestId, t;
}
function H(i) {
  return d(i) && i.protocol === b && i.version === g && typeof i.type == "string" && typeof i.appId == "string" && (i.requestId === void 0 || typeof i.requestId == "string") && (i.entryKey === void 0 || typeof i.entryKey == "string");
}
function p(i, t) {
  if (d(i) && i.ok === !1)
    return {
      ok: !1,
      error: c(i.error ?? i, {
        appId: t.appId,
        entryKey: t.entryKey,
        capability: t.request.capability,
        method: t.request.method,
        requestId: t.request.requestId
      })
    };
  if (d(i) && i.ok === !0) {
    const e = Object.prototype.hasOwnProperty.call(i, "value") ? i.value : Object.prototype.hasOwnProperty.call(i, "result") ? i.result : void 0;
    return l(
      {
        ok: !0,
        value: e
      },
      {
        traceId: u(i.traceId),
        evidenceId: u(i.evidenceId)
      }
    );
  }
  return d(i) && Object.prototype.hasOwnProperty.call(i, "result") ? {
    ok: !0,
    value: i.result
  } : {
    ok: !0,
    value: i
  };
}
function y(i) {
  return l(
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
class R {
  constructor(t) {
    r(this, "appId");
    r(this, "entryKey");
    r(this, "windowRef");
    r(this, "targetOrigin");
    r(this, "trustedHostOrigin");
    r(this, "requestTimeoutMs");
    r(this, "requestIdPrefix");
    r(this, "pendingRequests", /* @__PURE__ */ new Map());
    r(this, "subscriptionHandlers", /* @__PURE__ */ new Map());
    r(this, "snapshotHandlers", /* @__PURE__ */ new Set());
    r(this, "themeHandlers", /* @__PURE__ */ new Set());
    r(this, "visibilityHandlers", /* @__PURE__ */ new Set());
    r(this, "capabilityEventHandlers", /* @__PURE__ */ new Set());
    r(this, "callLog", []);
    r(this, "requestSequence", 0);
    r(this, "disposed", !1);
    r(this, "send", (t, e, s) => {
      this.postBridgeMessage(t, e, s);
    });
    r(this, "request", (t, e, s = {}) => {
      const n = this.buildHostActionContext(
        "lime.ui",
        t || "request",
        s.requestId
      );
      return this.requestBridgeAction(t, e, n, s).then(
        o
      );
    });
    r(this, "ready", () => {
      this.sendReady();
    });
    r(this, "getSnapshot", () => {
      this.postBridgeMessage("host:getSnapshot");
    });
    r(this, "getCallLog", () => [...this.callLog]);
    r(this, "handleHostMessage", (t) => {
      if (t.source !== this.windowRef?.parent || this.trustedHostOrigin && t.origin !== this.trustedHostOrigin || !H(t.data) || t.data.appId !== this.appId || this.entryKey && t.data.entryKey && t.data.entryKey !== this.entryKey)
        return;
      if (t.data.type === "host:snapshot") {
        d(t.data.payload) && d(t.data.payload.app) && (this.entryKey = u(t.data.payload.app.entryKey) ?? this.entryKey), this.dispatchHostEvent(this.snapshotHandlers, t.data.payload), t.data.requestId && this.settlePendingResponse(t.data.requestId, t.data.payload);
        return;
      }
      if (t.data.type === "theme:update") {
        this.dispatchHostEvent(this.themeHandlers, t.data.payload);
        return;
      }
      if (t.data.type === "host:visibility") {
        this.dispatchHostEvent(this.visibilityHandlers, t.data.payload);
        return;
      }
      if (t.data.type === "capability:event") {
        this.dispatchCapabilityEvent(t.data.payload);
        return;
      }
      if (t.data.type !== "host:response" && t.data.type !== "host:error")
        return;
      const e = t.data.requestId;
      if (!e)
        return;
      const s = this.pendingRequests.get(e);
      if (s) {
        if (this.windowRef?.clearTimeout(s.timerId), this.pendingRequests.delete(e), t.data.type === "host:error") {
          s.resolve({
            ok: !1,
            error: c(t.data.payload, {
              appId: this.appId,
              entryKey: this.entryKey,
              capability: s.request.capability,
              method: s.request.method,
              requestId: e
            })
          });
          return;
        }
        s.resolve(
          p(t.data.payload, {
            appId: this.appId,
            entryKey: this.entryKey,
            request: s.request
          })
        );
      }
    });
    this.appId = t.appId, this.entryKey = t.entryKey, this.windowRef = t.windowRef ?? t.hostWindow ?? (typeof window > "u" ? void 0 : window), this.targetOrigin = t.targetOrigin ?? t.trustedHostOrigin ?? "*", this.trustedHostOrigin = t.trustedHostOrigin, this.requestTimeoutMs = t.requestTimeoutMs ?? q, this.requestIdPrefix = t.requestIdPrefix ?? "lime-capability", t.onSnapshot && this.snapshotHandlers.add(t.onSnapshot), t.onTheme && this.themeHandlers.add(t.onTheme), t.onVisibility && this.visibilityHandlers.add(t.onVisibility), t.onCapabilityEvent && this.capabilityEventHandlers.add(t.onCapabilityEvent), this.windowRef?.addEventListener("message", this.handleHostMessage);
  }
  get pendingRequestCount() {
    return this.pendingRequests.size;
  }
  async call(t) {
    this.callLog.push({
      capability: t.capability,
      method: t.method,
      args: t.args
    });
    const e = {
      ...t,
      requestId: t.requestId ?? this.nextRequestId(t)
    };
    return this.requestBridgeAction(
      "capability:invoke",
      y(e),
      e
    );
  }
  sendReady() {
    this.postBridgeMessage("app:ready");
  }
  getHostSnapshot() {
    const t = this.buildHostActionContext("lime.ui", "getSnapshot");
    return this.requestBridgeAction("host:getSnapshot", void 0, t);
  }
  notifyHost(t, e) {
    const s = typeof t == "string" ? { message: t, level: e } : t, n = this.buildHostActionContext("lime.ui", "toast");
    return this.requestBridgeAction(
      "host:toast",
      s,
      n
    );
  }
  navigateHost(t) {
    const e = this.buildHostActionContext("lime.ui", "navigate");
    return this.requestBridgeAction(
      "host:navigate",
      t,
      e
    );
  }
  openExternalHost(t) {
    const e = this.buildHostActionContext("lime.ui", "openExternal");
    return this.requestBridgeAction(
      "host:openExternal",
      t,
      e
    );
  }
  selectDirectoryHost(t = {}, e = {}) {
    const s = {
      capability: "lime.ui",
      method: "selectDirectory",
      args: t,
      requestId: e.requestId ?? this.nextRequestId({
        capability: "lime.ui",
        method: "selectDirectory"
      })
    };
    return this.callLog.push({
      capability: s.capability,
      method: s.method,
      args: t
    }), this.requestBridgeAction(
      "capability:invoke",
      y(s),
      s,
      {
        ...e,
        timeoutMs: e.timeoutMs ?? w
      }
    );
  }
  downloadHost(t, e = {}) {
    const s = this.buildHostActionContext("lime.ui", "download");
    return this.requestBridgeAction(
      "host:download",
      t,
      s,
      e
    );
  }
  onHostSnapshot(t) {
    return this.snapshotHandlers.add(t), () => {
      this.snapshotHandlers.delete(t);
    };
  }
  onThemeUpdate(t) {
    return this.themeHandlers.add(t), () => {
      this.themeHandlers.delete(t);
    };
  }
  onVisibilityChange(t) {
    return this.visibilityHandlers.add(t), () => {
      this.visibilityHandlers.delete(t);
    };
  }
  onCapabilityEvent(t) {
    return this.capabilityEventHandlers.add(t), () => {
      this.capabilityEventHandlers.delete(t);
    };
  }
  invoke(t, e = {}) {
    return this.call(
      I({
        capability: t.capability,
        method: t.method,
        args: t.args,
        requestId: e.requestId,
        provenance: t.provenance
      })
    ).then(o);
  }
  subscribe(t, e = {}) {
    return this.subscribeCapability(t, void 0, e).then(
      o
    );
  }
  unsubscribe(t, e = {}) {
    return this.unsubscribeCapability(t, e).then(
      o
    );
  }
  async subscribeCapability(t, e, s = {}) {
    const n = {
      capability: t.capability,
      method: "subscribe",
      requestId: s.requestId ?? this.nextRequestId({
        capability: t.capability,
        method: "subscribe"
      })
    }, a = await this.requestBridgeAction(
      "capability:subscribe",
      l(
        {
          capability: t.capability,
          topic: t.topic
        },
        {
          input: t.input,
          subscriptionId: t.subscriptionId,
          pollIntervalMs: t.pollIntervalMs,
          bridgeAction: t.bridgeAction
        }
      ),
      n,
      s
    );
    if (a.ok && d(a.value)) {
      const h = u(a.value.subscriptionId);
      h && e && this.subscriptionHandlers.set(h, e);
    }
    return a;
  }
  async unsubscribeCapability(t, e = {}) {
    const s = {
      capability: "lime.agent",
      method: "unsubscribe",
      requestId: e.requestId ?? this.nextRequestId({
        capability: "lime.agent",
        method: "unsubscribe"
      })
    }, n = await this.requestBridgeAction(
      "capability:unsubscribe",
      { subscriptionId: t },
      s,
      e
    );
    return n.ok && this.subscriptionHandlers.delete(t), n;
  }
  download(t, e, s = {}) {
    return this.downloadHost({ url: t, fileName: e }, s).then(
      o
    );
  }
  requestBridgeAction(t, e, s, n = {}) {
    return this.disposed || !this.windowRef || this.windowRef.parent === this.windowRef.self ? Promise.resolve({
      ok: !1,
      error: this.buildError(
        "CAPABILITY_BLOCKED",
        "Lime host bridge is not connected.",
        s
      )
    }) : new Promise((a) => {
      const h = this.windowRef.setTimeout(() => {
        this.pendingRequests.delete(s.requestId), a({
          ok: !1,
          error: this.buildError(
            "TIMEOUT",
            "Lime host bridge request timed out.",
            s
          )
        });
      }, n.timeoutMs ?? this.requestTimeoutMs);
      this.pendingRequests.set(s.requestId, {
        request: s,
        resolve: a,
        timerId: h
      }), this.postBridgeMessage(t, e, s.requestId);
    });
  }
  dispose() {
    if (!this.disposed) {
      this.disposed = !0, this.windowRef?.removeEventListener("message", this.handleHostMessage);
      for (const t of this.pendingRequests.values())
        this.windowRef?.clearTimeout(t.timerId);
      this.pendingRequests.clear(), this.subscriptionHandlers.clear(), this.snapshotHandlers.clear(), this.themeHandlers.clear(), this.visibilityHandlers.clear();
    }
  }
  settlePendingResponse(t, e) {
    const s = this.pendingRequests.get(t);
    s && (this.windowRef?.clearTimeout(s.timerId), this.pendingRequests.delete(t), s.resolve(
      p(e, {
        appId: this.appId,
        entryKey: this.entryKey,
        request: s.request
      })
    ));
  }
  dispatchHostEvent(t, e) {
    for (const s of t)
      s(e);
  }
  dispatchCapabilityEvent(t) {
    if (!d(t))
      return;
    const e = u(t.subscriptionId), s = t;
    for (const a of this.capabilityEventHandlers)
      a(s);
    if (!e)
      return;
    const n = this.subscriptionHandlers.get(e);
    n && n(s);
  }
  postBridgeMessage(t, e, s) {
    this.disposed || !this.windowRef || this.windowRef.parent === this.windowRef.self || this.windowRef.parent.postMessage(
      this.buildMessage(t, e, s),
      this.targetOrigin
    );
  }
  buildMessage(t, e, s) {
    return {
      protocol: b,
      version: g,
      type: t,
      requestId: s,
      appId: this.appId,
      entryKey: this.entryKey,
      payload: e
    };
  }
  buildHostActionContext(t, e, s) {
    return {
      capability: t,
      method: e,
      requestId: s ?? this.nextRequestId({ capability: t, method: e })
    };
  }
  nextRequestId(t) {
    return this.requestSequence += 1, `${this.requestIdPrefix}-${this.requestSequence}-${t.capability}:${t.method}`;
  }
  buildError(t, e, s) {
    return c({
      code: t,
      message: e
    }, {
      appId: this.appId,
      entryKey: this.entryKey,
      capability: s.capability,
      method: s.method,
      requestId: s.requestId
    });
  }
}
function C(i) {
  return new R(i);
}
export {
  b as LIME_AGENT_APP_BRIDGE_PROTOCOL,
  g as LIME_AGENT_APP_BRIDGE_VERSION,
  C as createLimeHostBridgeCapabilityInvoker
};
