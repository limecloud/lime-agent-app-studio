var y = Object.defineProperty;
var g = (e, t, i) => t in e ? y(e, t, { enumerable: !0, configurable: !0, writable: !0, value: i }) : e[t] = i;
var r = (e, t, i) => g(e, typeof t != "symbol" ? t + "" : t, i);
import { toLimeCapabilityError as u } from "./capabilityErrors.js";
const c = "lime.agentApp.bridge", l = 1, b = 15e3;
function o(e) {
  return typeof e == "object" && e !== null;
}
function p(e, t) {
  return Object.entries(t).forEach(([i, s]) => {
    s !== void 0 && (e[i] = s);
  }), e;
}
function a(e) {
  return typeof e == "string" && e.trim() ? e.trim() : void 0;
}
function f(e) {
  return o(e) && e.protocol === c && e.version === l && typeof e.type == "string" && typeof e.appId == "string" && (e.requestId === void 0 || typeof e.requestId == "string") && (e.entryKey === void 0 || typeof e.entryKey == "string");
}
function h(e, t) {
  if (o(e) && e.ok === !1)
    return {
      ok: !1,
      error: u(e.error ?? e, {
        appId: t.appId,
        entryKey: t.entryKey,
        capability: t.request.capability,
        method: t.request.method,
        requestId: t.request.requestId
      })
    };
  if (o(e) && e.ok === !0) {
    const i = Object.prototype.hasOwnProperty.call(e, "value") ? e.value : Object.prototype.hasOwnProperty.call(e, "result") ? e.result : void 0;
    return p(
      {
        ok: !0,
        value: i
      },
      {
        traceId: a(e.traceId),
        evidenceId: a(e.evidenceId)
      }
    );
  }
  return o(e) && Object.prototype.hasOwnProperty.call(e, "result") ? {
    ok: !0,
    value: e.result
  } : {
    ok: !0,
    value: e
  };
}
function I(e) {
  return p(
    {
      capability: e.capability,
      method: e.method
    },
    {
      input: e.args,
      idempotencyKey: e.idempotencyKey,
      expectedSchema: e.expectedSchema,
      provenance: e.provenance
    }
  );
}
class m {
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
    r(this, "requestSequence", 0);
    r(this, "disposed", !1);
    r(this, "handleHostMessage", (t) => {
      if (t.source !== this.windowRef?.parent || this.trustedHostOrigin && t.origin !== this.trustedHostOrigin || !f(t.data) || t.data.appId !== this.appId || this.entryKey && t.data.entryKey && t.data.entryKey !== this.entryKey)
        return;
      if (t.data.type === "host:snapshot") {
        this.dispatchHostEvent(this.snapshotHandlers, t.data.payload), t.data.requestId && this.settlePendingResponse(t.data.requestId, t.data.payload);
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
      const i = t.data.requestId;
      if (!i)
        return;
      const s = this.pendingRequests.get(i);
      if (s) {
        if (this.windowRef?.clearTimeout(s.timerId), this.pendingRequests.delete(i), t.data.type === "host:error") {
          s.resolve({
            ok: !1,
            error: u(t.data.payload, {
              appId: this.appId,
              entryKey: this.entryKey,
              capability: s.request.capability,
              method: s.request.method,
              requestId: i
            })
          });
          return;
        }
        s.resolve(
          h(t.data.payload, {
            appId: this.appId,
            entryKey: this.entryKey,
            request: s.request
          })
        );
      }
    });
    this.appId = t.appId, this.entryKey = t.entryKey, this.windowRef = t.windowRef ?? (typeof window > "u" ? void 0 : window), this.targetOrigin = t.targetOrigin ?? t.trustedHostOrigin ?? "*", this.trustedHostOrigin = t.trustedHostOrigin, this.requestTimeoutMs = t.requestTimeoutMs ?? b, this.requestIdPrefix = t.requestIdPrefix ?? "lime-capability", this.windowRef?.addEventListener("message", this.handleHostMessage);
  }
  get pendingRequestCount() {
    return this.pendingRequests.size;
  }
  async call(t) {
    const i = {
      ...t,
      requestId: t.requestId ?? this.nextRequestId(t)
    };
    return this.requestBridgeAction(
      "capability:invoke",
      I(i),
      i
    );
  }
  sendReady() {
    this.postBridgeMessage("app:ready");
  }
  getHostSnapshot() {
    const t = this.buildHostActionContext("lime.ui", "getSnapshot");
    return this.requestBridgeAction("host:getSnapshot", void 0, t);
  }
  notifyHost(t) {
    const i = this.buildHostActionContext("lime.ui", "toast");
    return this.requestBridgeAction(
      "host:toast",
      t,
      i
    );
  }
  navigateHost(t) {
    const i = this.buildHostActionContext("lime.ui", "navigate");
    return this.requestBridgeAction(
      "host:navigate",
      t,
      i
    );
  }
  openExternalHost(t) {
    const i = this.buildHostActionContext("lime.ui", "openExternal");
    return this.requestBridgeAction(
      "host:openExternal",
      t,
      i
    );
  }
  downloadHost(t) {
    const i = this.buildHostActionContext("lime.ui", "download");
    return this.requestBridgeAction(
      "host:download",
      t,
      i
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
  async subscribeCapability(t, i) {
    const s = {
      capability: t.capability,
      method: "subscribe",
      requestId: this.nextRequestId({
        capability: t.capability,
        method: "subscribe"
      })
    }, n = await this.requestBridgeAction(
      "capability:subscribe",
      p(
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
      s
    );
    if (n.ok && o(n.value)) {
      const d = a(n.value.subscriptionId);
      d && this.subscriptionHandlers.set(d, i);
    }
    return n;
  }
  async unsubscribeCapability(t) {
    const i = {
      capability: "lime.agent",
      method: "unsubscribe",
      requestId: this.nextRequestId({
        capability: "lime.agent",
        method: "unsubscribe"
      })
    }, s = await this.requestBridgeAction(
      "capability:unsubscribe",
      { subscriptionId: t },
      i
    );
    return s.ok && this.subscriptionHandlers.delete(t), s;
  }
  requestBridgeAction(t, i, s) {
    return this.disposed || !this.windowRef || this.windowRef.parent === this.windowRef.self ? Promise.resolve({
      ok: !1,
      error: this.buildError(
        "CAPABILITY_BLOCKED",
        "Lime host bridge is not connected.",
        s
      )
    }) : new Promise((n) => {
      const d = this.windowRef.setTimeout(() => {
        this.pendingRequests.delete(s.requestId), n({
          ok: !1,
          error: this.buildError(
            "TIMEOUT",
            "Lime host bridge request timed out.",
            s
          )
        });
      }, this.requestTimeoutMs);
      this.pendingRequests.set(s.requestId, {
        request: s,
        resolve: n,
        timerId: d
      }), this.postBridgeMessage(t, i, s.requestId);
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
  settlePendingResponse(t, i) {
    const s = this.pendingRequests.get(t);
    s && (this.windowRef?.clearTimeout(s.timerId), this.pendingRequests.delete(t), s.resolve(
      h(i, {
        appId: this.appId,
        entryKey: this.entryKey,
        request: s.request
      })
    ));
  }
  dispatchHostEvent(t, i) {
    for (const s of t)
      s(i);
  }
  dispatchCapabilityEvent(t) {
    if (!o(t))
      return;
    const i = a(t.subscriptionId);
    if (!i)
      return;
    const s = this.subscriptionHandlers.get(i);
    s && s(t);
  }
  postBridgeMessage(t, i, s) {
    this.disposed || !this.windowRef || this.windowRef.parent === this.windowRef.self || this.windowRef.parent.postMessage(
      this.buildMessage(t, i, s),
      this.targetOrigin
    );
  }
  buildMessage(t, i, s) {
    return {
      protocol: c,
      version: l,
      type: t,
      requestId: s,
      appId: this.appId,
      entryKey: this.entryKey,
      payload: i
    };
  }
  buildHostActionContext(t, i) {
    return {
      capability: t,
      method: i,
      requestId: this.nextRequestId({ capability: t, method: i })
    };
  }
  nextRequestId(t) {
    return this.requestSequence += 1, `${this.requestIdPrefix}-${this.requestSequence}-${t.capability}:${t.method}`;
  }
  buildError(t, i, s) {
    return u({
      code: t,
      message: i
    }, {
      appId: this.appId,
      entryKey: this.entryKey,
      capability: s.capability,
      method: s.method,
      requestId: s.requestId
    });
  }
}
function H(e) {
  return new m(e);
}
export {
  c as LIME_AGENT_APP_BRIDGE_PROTOCOL,
  l as LIME_AGENT_APP_BRIDGE_VERSION,
  H as createLimeHostBridgeCapabilityInvoker
};
