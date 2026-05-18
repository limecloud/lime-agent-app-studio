var c = Object.defineProperty;
var I = (e, t, i) => t in e ? c(e, t, { enumerable: !0, configurable: !0, writable: !0, value: i }) : e[t] = i;
var a = (e, t, i) => I(e, typeof t != "symbol" ? t + "" : t, i);
const b = [
  "capability_unavailable",
  "readiness_blocked",
  "permission_denied",
  "policy_denied",
  "schema_invalid",
  "source_unverified",
  "secret_required",
  "timeout",
  "cancelled",
  "conflict",
  "upstream_failed"
], u = {
  APP_RUNTIME_UNSUPPORTED: "capability_unavailable",
  CAPABILITY_BLOCKED: "capability_unavailable",
  CAPABILITY_NOT_DECLARED: "capability_unavailable",
  ENTRY_NOT_FOUND: "readiness_blocked",
  FEATURE_DISABLED: "capability_unavailable",
  HOST_ACTION_FAILED: "upstream_failed",
  INVALID_CAPABILITY_INPUT: "schema_invalid",
  INVALID_PAYLOAD: "schema_invalid",
  PERMISSION_DENIED: "permission_denied",
  POLICY_DENIED: "policy_denied",
  READINESS_BLOCKED: "readiness_blocked",
  SECRET_REQUIRED: "secret_required",
  SOURCE_UNVERIFIED: "source_unverified",
  STORAGE_KEY_NOT_FOUND: "conflict",
  TASK_NOT_FOUND: "conflict",
  TIMEOUT: "timeout",
  UNTRUSTED_URL: "policy_denied",
  UNSUPPORTED_CAPABILITY: "capability_unavailable",
  UNSUPPORTED_CAPABILITY_METHOD: "capability_unavailable",
  UI_ENTRY_UNSUPPORTED: "capability_unavailable",
  WORKFLOW_POLICY_VIOLATION: "policy_denied",
  WORKFLOW_RUNTIME_DISABLED: "capability_unavailable"
};
function p(e) {
  return typeof e == "string" && b.includes(e);
}
function r(e) {
  return p(e) ? e : e ? u[e] ?? "upstream_failed" : "upstream_failed";
}
function l(e, t) {
  if (!(typeof e != "object" || e === null))
    return e[t];
}
function s(e, t) {
  const i = l(e, t);
  return typeof i == "string" && i.trim() ? i.trim() : void 0;
}
function E(e, t) {
  const i = l(e, t);
  return typeof i == "boolean" ? i : void 0;
}
function n(e, t) {
  return Object.entries(t).forEach(([i, d]) => {
    d !== void 0 && (e[i] = d);
  }), e;
}
class y extends Error {
  constructor(i) {
    super(i.message);
    a(this, "code");
    a(this, "stableCode");
    a(this, "appId");
    a(this, "entryKey");
    a(this, "capability");
    a(this, "method");
    a(this, "requestId");
    a(this, "traceId");
    a(this, "retryable");
    a(this, "details");
    this.name = "AgentAppCapabilityError", this.code = i.code, this.stableCode = i.stableCode ?? r(i.code), this.appId = i.appId, this.entryKey = i.entryKey, this.capability = i.capability, this.method = i.method, this.requestId = i.requestId, this.traceId = i.traceId, this.retryable = i.retryable, this.details = i.details;
  }
  toStableError(i = {}) {
    return n(
      {
        code: this.stableCode,
        message: this.message,
        causeCode: this.code
      },
      {
        appId: i.appId ?? this.appId,
        entryKey: i.entryKey ?? this.entryKey,
        capability: i.capability ?? this.capability,
        method: i.method ?? this.method,
        requestId: i.requestId ?? this.requestId,
        traceId: i.traceId ?? this.traceId,
        retryable: i.retryable ?? this.retryable,
        details: i.details ?? this.details
      }
    );
  }
}
function h(e, t = {}) {
  if (e instanceof y)
    return e.toStableError(t);
  const i = s(e, "stableCode") ?? s(e, "code"), d = s(e, "code"), _ = e instanceof Error ? e.message : s(e, "message") ?? "Lime capability call failed.";
  return n(
    {
      code: r(i),
      message: _
    },
    {
      appId: t.appId ?? s(e, "appId"),
      entryKey: t.entryKey ?? s(e, "entryKey"),
      capability: t.capability ?? s(e, "capability"),
      method: t.method ?? s(e, "method"),
      requestId: t.requestId ?? s(e, "requestId"),
      traceId: t.traceId ?? s(e, "traceId"),
      retryable: t.retryable ?? E(e, "retryable"),
      causeCode: d,
      details: t.details ?? l(e, "details")
    }
  );
}
export {
  y as AgentAppCapabilityError,
  b as LIME_CAPABILITY_ERROR_CODES,
  p as isLimeCapabilityErrorCode,
  r as normalizeLimeCapabilityErrorCode,
  h as toLimeCapabilityError
};
