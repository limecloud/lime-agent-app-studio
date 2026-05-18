import { toLimeCapabilityError as c } from "./capabilityErrors.js";
import { LIME_CAPABILITY_NAMES as b } from "./capabilityCatalog.js";
function r(t, e) {
  return Object.entries(e).forEach(([i, a]) => {
    a !== void 0 && (t[i] = a);
  }), t;
}
function y(t) {
  return r(
    {
      appId: t.appId,
      packageHash: t.packageHash,
      manifestHash: t.manifestHash
    },
    {
      entryKey: t.entryKey,
      workflowRunId: t.workflowRunId,
      workspaceId: t.workspaceId,
      taskId: t.taskId
    }
  );
}
function p(t) {
  return r(
    {
      capability: t.capability,
      method: t.method
    },
    {
      args: t.args,
      requestId: t.requestId,
      idempotencyKey: t.idempotencyKey,
      expectedSchema: t.expectedSchema,
      provenance: t.provenance
    }
  );
}
function n(t, e = {}) {
  return r(
    {
      ok: !0,
      value: t
    },
    e
  );
}
function o(t, e = {}) {
  return {
    ok: !1,
    error: c(t, e)
  };
}
function l(t) {
  return {
    async call(e) {
      try {
        return await t.dispatch(
          e
        );
      } catch (i) {
        return o(i, {
          capability: e.capability,
          method: e.method,
          requestId: e.requestId
        });
      }
    }
  };
}
function h(t = {}) {
  return {
    async dispatch(e) {
      const i = t[e.capability]?.[e.method];
      if (!i)
        return o(
          {
            code: "UNSUPPORTED_CAPABILITY_METHOD",
            message: `${e.capability}.${e.method} is not available in the mock host.`
          },
          {
            capability: e.capability,
            method: e.method,
            requestId: e.requestId
          }
        );
      try {
        return n(await i(e));
      } catch (a) {
        return o(a, {
          capability: e.capability,
          method: e.method,
          requestId: e.requestId
        });
      }
    }
  };
}
export {
  b as LIME_CAPABILITY_NAMES,
  y as buildLimeCapabilityInvokeProvenance,
  p as buildLimeCapabilityInvokeRequest,
  o as createLimeCapabilityErrorResponse,
  l as createLimeCapabilityInvoker,
  n as createLimeCapabilitySuccessResponse,
  h as createMockLimeCapabilityTransport
};
