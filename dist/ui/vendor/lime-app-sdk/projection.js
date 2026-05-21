function J({
  events: t = [],
  ...r
} = {}) {
  return t.flatMap(
    (i) => Y(i, r)
  ).map(({ event: i, inherited: o }) => mt(i, o)).filter(
    (i) => !!i
  ).map((i, o) => ({
    ...i,
    sequence: typeof r.startSequence == "number" ? r.startSequence + o : o + 1
  }));
}
function Y(t, r) {
  if (!B(t))
    return [];
  const e = {
    ...r,
    sessionId: a(t, "sessionId") ?? r.sessionId,
    threadId: a(t, "threadId") ?? r.threadId,
    turnId: a(t, "turnId") ?? r.turnId,
    taskId: a(t, "taskId") ?? r.taskId,
    runId: a(t, "runtimeEventName") ?? r.runId,
    timestamp: a(t, "occurredAt") ?? a(t, "emittedAt") ?? r.timestamp
  }, n = xt(t, "taskEvents");
  return n.length > 0 ? n.flatMap(
    (i) => Y(i, e)
  ) : [{ event: t, inherited: e }];
}
function mt(t, r) {
  const e = a(t, "eventType") ?? a(t, "type"), n = St(e);
  if (n)
    return ft(t, r, n);
  const i = Rt(t);
  if (i)
    return pt(t, r, i);
  switch (e) {
    case "task:queued":
      return f(t, r, {
        type: "queue.changed",
        sourceType: "queue_added",
        phase: "submitted",
        surface: "task_capsule",
        runtimeStatus: "queued",
        control: "queue"
      });
    case "task:toolCall":
      return gt(t, r);
    case "task:reviewRequested":
    case "task:missingContextRequested":
    case "task:blocked":
      return K(t, r, "action.required");
    case "task:reviewResolved":
      return K(t, r, "action.resolved");
    case "artifact:created":
      return yt(t, r);
    case "evidence:recorded":
    case "evidence:verified":
      return ht(t, r);
    case "metric.changed":
    case "task:metricChanged":
    case "task:costEstimated":
    case "task:costRecorded":
      return It(t, r);
    case "diagnostic.changed":
    case "task:diagnostic":
    case "task:warning":
      return _t(t, r);
    case "task:completed":
      return f(t, r, {
        type: "run.finished",
        sourceType: "runtime_status",
        phase: "completed",
        surface: "runtime_status",
        runtimeStatus: "completed",
        persistence: "archive"
      });
    case "task:error":
      return f(t, r, {
        type: "run.failed",
        sourceType: "runtime_status",
        phase: "failed",
        surface: "runtime_status",
        runtimeStatus: "failed",
        persistence: "archive"
      });
    case "task:cancelled":
      return f(t, r, {
        type: "run.finished",
        sourceType: "runtime_status",
        phase: "cancelled",
        surface: "runtime_status",
        runtimeStatus: "cancelled",
        persistence: "archive"
      });
    case "task:progress":
    case "task:status":
    case "task:runtimeEvent":
    case "task:incident":
      return V(t, r);
    default:
      return e ? V(t, r) : null;
  }
}
function ft(t, r, e) {
  const n = c(t, "payload") ?? {}, i = [
    ...S(t, "controls"),
    ...S(n, "controls")
  ].filter(D);
  return f(t, r, {
    type: e,
    sourceType: jt(e),
    phase: wt(e),
    surface: Et(e),
    runtimeStatus: bt(e, t),
    persistence: Nt(e),
    toolCallId: a(t, "toolCallId") ?? R(t),
    actionId: a(t, "actionId") ?? U(t),
    artifactId: a(t, "artifactId") ?? et(t),
    evidenceId: a(t, "evidenceId") ?? rt(t),
    partId: a(t, "partId") ?? h(t),
    diagnosticId: a(t, "diagnosticId") ?? h(t),
    control: Ct(t),
    refs: c(t, "refs") ?? void 0,
    payload: {
      ...n,
      controls: i.length > 0 ? tt(i) : n.controls,
      preview: a(n, "preview") ?? p(a(t, "message"))
    }
  });
}
function pt(t, r, e) {
  const n = qt(t);
  return e === "thinking_delta" ? f(t, r, {
    type: "reasoning.delta",
    sourceType: "thinking_delta",
    phase: "reasoning",
    surface: "inline_process",
    runtimeStatus: "running",
    persistence: "ephemeral_live",
    partId: h(t),
    payload: {
      streamKind: e,
      preview: p(n),
      textLength: n.length
    }
  }) : e === "tool_input_delta" ? f(t, r, {
    type: "tool.args.delta",
    sourceType: "tool_input_delta",
    phase: "acting",
    surface: "tool_ui",
    runtimeStatus: "running",
    persistence: "ephemeral_live",
    toolCallId: R(t),
    payload: {
      streamKind: e,
      toolName: F(t),
      preview: p(n),
      textLength: n.length
    }
  }) : e === "tool_output_delta" ? f(t, r, {
    type: "tool.output.delta",
    sourceType: "tool_output_delta",
    phase: "acting",
    surface: "tool_ui",
    runtimeStatus: "running",
    persistence: "ephemeral_live",
    toolCallId: R(t),
    payload: {
      streamKind: e,
      toolName: F(t),
      preview: p(n),
      textLength: n.length
    }
  }) : f(t, r, {
    type: "text.delta",
    sourceType: "text_delta",
    phase: "producing",
    surface: "conversation",
    runtimeStatus: "running",
    persistence: "transcript",
    partId: h(t),
    payload: {
      streamKind: e,
      preview: p(n),
      textLength: n.length
    }
  });
}
function gt(t, r) {
  const e = w(a(t, "status")), n = e === "failed", i = e === "completed";
  return f(t, r, {
    type: n ? "tool.failed" : i ? "tool.result" : "tool.started",
    sourceType: n || i ? "tool_end" : "tool_start",
    phase: n ? "failed" : i ? "completed" : "acting",
    surface: "tool_ui",
    runtimeStatus: n ? "failed" : i ? "completed" : "running",
    persistence: i || n ? "archive" : "ephemeral_live",
    toolCallId: R(t),
    payload: {
      toolName: F(t),
      status: e,
      preview: p(a(t, "message")),
      payloadKeys: A(t)
    }
  });
}
function K(t, r, e) {
  const n = e === "action.required", i = c(t, "payload"), o = a(t, "eventType"), u = n ? Wt(t) : [];
  return f(t, r, {
    type: e,
    sourceType: n ? "action_required" : "action_resolved",
    phase: n ? "waiting" : "completed",
    surface: "hitl",
    runtimeStatus: n ? "needs_input" : "completed",
    persistence: n ? "snapshot" : "archive",
    actionId: U(t),
    control: n ? u[0] : "none",
    payload: {
      status: a(t, "status"),
      requestId: U(t),
      actionType: a(t, "actionType") ?? a(i, "actionType") ?? Pt(o),
      controls: u,
      preview: p(a(t, "message")),
      payloadKeys: A(t)
    }
  });
}
function yt(t, r) {
  const e = w(a(t, "status")), n = a(t, "artifactRef") ?? $t(t), i = vt(t);
  return f(t, r, {
    type: e === "failed" ? "artifact.failed" : "artifact.created",
    sourceType: "artifact_snapshot",
    phase: e === "failed" ? "failed" : "completed",
    surface: "artifact_workspace",
    runtimeStatus: e === "failed" ? "failed" : "completed",
    persistence: "artifact_store",
    artifactId: et(t) ?? n,
    refs: n ? { artifactPaths: [n] } : void 0,
    payload: {
      status: e,
      artifactRef: n,
      preview: p(i),
      payloadKeys: A(t)
    }
  });
}
function ht(t, r) {
  const e = a(t, "evidenceRef") ?? rt(t);
  return f(t, r, {
    type: "evidence.changed",
    sourceType: "evidence_projection",
    phase: "completed",
    surface: "timeline_evidence",
    runtimeStatus: "completed",
    persistence: "evidence_pack",
    evidenceId: e,
    refs: e ? { rawEventRef: e } : void 0,
    payload: {
      status: a(t, "status"),
      evidenceRef: e,
      preview: p(a(t, "message")),
      payloadKeys: A(t)
    }
  });
}
function It(t, r) {
  const e = c(t, "payload"), n = w(a(t, "status"));
  return f(t, r, {
    type: "metric.changed",
    sourceType: "performance_metric",
    phase: "acting",
    surface: "diagnostics",
    runtimeStatus: v(n),
    persistence: "diagnostics_log",
    payload: {
      metricName: a(t, "metricName") ?? a(e, "metricName") ?? a(e, "metric") ?? a(t, "eventType"),
      status: n,
      providerName: a(t, "providerName") ?? a(e, "providerName"),
      modelName: a(t, "modelName") ?? a(e, "modelName") ?? a(e, "model"),
      preview: p(a(t, "message")) ?? p(a(e, "preview")) ?? Mt(t),
      usage: c(t, "usage") ?? c(e, "usage"),
      cost: c(t, "cost") ?? c(e, "cost"),
      payloadKeys: A(t)
    }
  });
}
function _t(t, r) {
  const e = w(a(t, "status"));
  return f(t, r, {
    type: "diagnostic.changed",
    sourceType: "runtime_status",
    phase: e === "failed" ? "failed" : "acting",
    surface: "diagnostics",
    runtimeStatus: v(e),
    persistence: "diagnostics_log",
    diagnosticId: h(t),
    payload: {
      status: e,
      code: a(t, "code") ?? a(c(t, "payload"), "code"),
      preview: p(a(t, "message")),
      payloadKeys: A(t)
    }
  });
}
function V(t, r) {
  const e = w(a(t, "status"));
  return f(t, r, {
    type: e === "failed" ? "run.failed" : "run.status",
    sourceType: "runtime_status",
    phase: At(e),
    surface: "runtime_status",
    runtimeStatus: v(e),
    persistence: e === "completed" || e === "failed" ? "archive" : "ephemeral_live",
    payload: {
      status: e,
      eventType: a(t, "eventType") ?? a(t, "type"),
      preview: p(a(t, "message")),
      payloadKeys: A(t)
    }
  });
}
function f(t, r, e) {
  const n = h(t), i = a(t, "occurredAt") ?? r.timestamp ?? void 0;
  return {
    sourceType: e.sourceType,
    type: e.type,
    timestamp: i,
    sessionId: I(r.sessionId),
    threadId: a(t, "threadId") ?? I(r.threadId),
    runId: I(r.runId),
    turnId: a(t, "turnId") ?? I(r.turnId),
    taskId: a(t, "taskId") ?? I(r.taskId),
    owner: kt(e.type),
    scope: Tt(e.type),
    phase: e.phase,
    surface: e.surface,
    persistence: e.persistence ?? "ephemeral_live",
    runtimeEntity: "agent_turn",
    runtimeStatus: e.runtimeStatus,
    latestTurnStatus: e.runtimeStatus,
    toolCallId: e.toolCallId,
    actionId: e.actionId,
    artifactId: e.artifactId,
    evidenceId: e.evidenceId,
    partId: e.partId,
    control: e.control,
    refs: e.refs,
    rawEventRef: n,
    payload: {
      appId: I(r.appId),
      taskId: a(t, "taskId") ?? I(r.taskId),
      sourceEventId: n,
      ...e.payload
    }
  };
}
function kt(t) {
  return t.startsWith("text.") || t.startsWith("reasoning.") ? "model" : t.startsWith("tool.") ? "tool" : t.startsWith("action.") ? "action" : t.startsWith("artifact.") ? "artifact" : t.startsWith("evidence.") ? "evidence" : t.startsWith("diagnostic.") || t.startsWith("metric.") ? "diagnostics" : t.startsWith("queue.") || t.startsWith("task.") ? "task" : "runtime";
}
function Tt(t) {
  return t.startsWith("text.") || t.startsWith("reasoning.") ? "part" : t.startsWith("tool.") ? "tool_call" : t.startsWith("action.") ? "action_request" : t.startsWith("artifact.") ? "artifact" : t.startsWith("evidence.") ? "evidence" : t.startsWith("diagnostic.") || t.startsWith("metric.") ? "run" : t.startsWith("queue.") ? "task" : "run";
}
function At(t) {
  switch (t) {
    case "queued":
      return "submitted";
    case "running":
    case "streaming":
      return "acting";
    case "blocked":
    case "pending":
    case "requires_host_authorization":
      return "waiting";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "routing":
      return "routing";
    default:
      return "preparing";
  }
}
function v(t) {
  switch (t) {
    case "queued":
      return "queued";
    case "running":
    case "streaming":
    case "routing":
      return "running";
    case "blocked":
    case "pending":
    case "requires_host_authorization":
    case "needs_input":
      return "needs_input";
    case "completed":
    case "succeeded":
      return "completed";
    case "failed":
    case "error":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "unknown";
  }
}
function St(t) {
  if (!t || t.includes(":"))
    return null;
  const r = t.split(".")[0];
  return [
    "run",
    "text",
    "reasoning",
    "tool",
    "action",
    "queue",
    "task",
    "artifact",
    "evidence",
    "diagnostic",
    "metric",
    "state",
    "messages",
    "review",
    "team",
    "agent"
  ].includes(r) ? t : null;
}
function jt(t) {
  return t.startsWith("metric.") ? "performance_metric" : t.startsWith("evidence.") ? "evidence_projection" : t.startsWith("artifact.") ? "artifact_snapshot" : t === "tool.started" || t === "tool.args" ? "tool_start" : t === "tool.result" || t === "tool.failed" ? "tool_end" : t === "tool.progress" ? "tool_progress" : t === "tool.output.delta" ? "tool_output_delta" : t === "tool.args.delta" ? "tool_input_delta" : t === "text.delta" || t === "text.final" ? "text_delta" : t.startsWith("reasoning.") ? "thinking_delta" : t === "action.required" ? "action_required" : t === "action.resolved" ? "action_resolved" : "runtime_status";
}
function wt(t) {
  return t.startsWith("text.") ? "producing" : t.startsWith("reasoning.") ? "reasoning" : t.startsWith("tool.") ? t === "tool.failed" ? "failed" : t === "tool.result" ? "completed" : "acting" : t === "action.required" ? "waiting" : t === "action.resolved" ? "completed" : t.startsWith("artifact.") || t.startsWith("evidence.") ? t.endsWith(".failed") ? "failed" : "completed" : t === "run.finished" ? "completed" : t === "run.failed" ? "failed" : t.startsWith("queue.") ? "submitted" : "acting";
}
function Et(t) {
  return t.startsWith("text.") ? "conversation" : t.startsWith("reasoning.") ? "inline_process" : t.startsWith("tool.") ? "tool_ui" : t.startsWith("action.") ? "hitl" : t.startsWith("artifact.") ? "artifact_workspace" : t.startsWith("evidence.") ? "timeline_evidence" : t.startsWith("diagnostic.") || t.startsWith("metric.") ? "diagnostics" : t.startsWith("queue.") || t.startsWith("task.") ? "task_capsule" : "runtime_status";
}
function bt(t, r) {
  const e = a(r, "runtimeStatus") ?? a(r, "status");
  return e ? v(w(e)) : t === "run.finished" || t === "tool.result" || t === "action.resolved" ? "completed" : t === "run.failed" || t === "tool.failed" || t.endsWith(".failed") ? "failed" : t === "action.required" ? "needs_input" : t.startsWith("text.") || t.startsWith("reasoning.") || t.startsWith("tool.") ? "running" : "unknown";
}
function Nt(t) {
  return t.startsWith("text.") ? "transcript" : t.startsWith("artifact.") ? "artifact_store" : t.startsWith("evidence.") ? "evidence_pack" : t.startsWith("diagnostic.") || t.startsWith("metric.") ? "diagnostics_log" : t === "run.finished" || t === "run.failed" || t === "tool.result" || t === "tool.failed" || t === "action.resolved" ? "archive" : "ephemeral_live";
}
function Ct(t) {
  const r = a(t, "control");
  return r === "none" ? "none" : r && D(r) ? r : void 0;
}
function Wt(t) {
  const r = c(t, "payload"), e = [
    ...S(t, "controls"),
    ...S(t, "allowedControls"),
    ...S(r, "controls"),
    ...S(r, "allowedControls")
  ].filter(D);
  if (e.length > 0)
    return tt(e);
  const n = a(t, "eventType");
  return n === "task:missingContextRequested" ? ["answer"] : n === "task:blocked" ? ["answer"] : n === "task:reviewRequested" ? ["approve", "reject"] : ["approve"];
}
function Pt(t) {
  return "ask_user";
}
function D(t) {
  return [
    "approve",
    "reject",
    "answer",
    "edit",
    "retry",
    "interrupt",
    "stop"
  ].includes(t);
}
function tt(t) {
  return [...new Set(t)];
}
function Rt(t) {
  const r = c(t, "payload"), e = c(r, "runtimeEvent");
  return a(r, "streamKind") ?? a(t, "streamKind") ?? a(e, "type");
}
function qt(t) {
  const r = c(t, "payload"), e = c(r, "runtimeEvent");
  return a(r, "delta") ?? a(r, "text") ?? a(e, "text") ?? a(e, "delta") ?? a(t, "message") ?? "";
}
function F(t) {
  const r = c(t, "payload"), e = c(r, "runtimeEvent"), n = c(e, "result"), i = c(n, "metadata"), o = a(i, "skill_name") ?? a(i, "skillName");
  return o ? `Skill(${o})` : a(t, "toolName") ?? a(t, "tool_name") ?? a(r, "tool_name") ?? a(r, "toolName") ?? a(e, "tool_name") ?? a(e, "toolName") ?? a(e, "tool_id") ?? void 0;
}
function R(t) {
  const r = c(t, "payload"), e = c(r, "runtimeEvent");
  return a(t, "toolId") ?? a(t, "toolCallId") ?? a(r, "tool_call_id") ?? a(r, "toolCallId") ?? a(r, "tool_id") ?? a(e, "tool_id") ?? a(e, "toolId") ?? h(t) ?? void 0;
}
function U(t) {
  const r = c(t, "payload");
  return a(t, "requestId") ?? a(t, "actionId") ?? a(r, "request_id") ?? a(r, "requestId") ?? h(t) ?? void 0;
}
function et(t) {
  const r = c(t, "payload"), e = c(r, "artifact");
  return a(t, "artifactId") ?? a(e, "artifact_id") ?? a(e, "artifactId") ?? a(e, "item_id") ?? a(e, "itemId") ?? void 0;
}
function $t(t) {
  const r = c(t, "payload"), e = c(r, "artifact");
  return a(t, "artifactRef") ?? a(r, "artifactRef") ?? a(e, "path") ?? a(e, "file_path") ?? a(e, "filePath") ?? void 0;
}
function vt(t) {
  const r = c(t, "payload"), e = c(r, "artifact");
  return a(t, "message") ?? a(r, "message") ?? a(r, "title") ?? a(e, "title") ?? a(e, "name") ?? void 0;
}
function rt(t) {
  const r = c(t, "payload");
  return a(t, "evidenceRef") ?? a(r, "evidenceRef") ?? a(r, "evidence_id") ?? a(r, "evidenceId") ?? void 0;
}
function h(t) {
  return a(t, "id") ?? a(t, "eventId") ?? void 0;
}
function A(t) {
  const r = c(t, "payload");
  if (!r)
    return;
  const e = Object.keys(r).sort();
  return e.length ? e : void 0;
}
function Mt(t) {
  const r = c(t, "payload"), e = c(t, "usage") ?? c(r, "usage"), n = c(t, "cost") ?? c(r, "cost"), i = a(t, "modelName") ?? a(r, "modelName") ?? a(r, "model"), o = b(e, "totalTokens") ?? b(e, "total_tokens"), u = b(n, "total") ?? b(n, "estimatedTotalCost") ?? b(n, "estimated_total_cost"), d = [
    i,
    typeof o == "number" ? `${o} tokens` : void 0,
    typeof u == "number" ? `${u}` : void 0
  ].filter((m) => !!m);
  return d.length ? d.join(" · ") : void 0;
}
function w(t) {
  const r = t?.trim().toLowerCase();
  switch (r) {
    case "succeeded":
    case "success":
    case "created":
    case "ready":
    case "verified":
    case "recorded":
    case "resolved":
      return "completed";
    case "error":
    case "warning":
      return "failed";
    default:
      return r || "updated";
  }
}
function p(t) {
  const r = t?.trim();
  if (r)
    return r.length <= 160 ? r : `${r.slice(0, 160).trim()}...`;
}
function I(t) {
  return t?.trim() || void 0;
}
function a(t, r) {
  const e = t?.[r];
  return typeof e == "string" && e.trim() ? e.trim() : null;
}
function S(t, r) {
  const e = t?.[r];
  return Array.isArray(e) ? e.filter((n) => typeof n == "string") : [];
}
function b(t, r) {
  const e = t?.[r];
  return typeof e == "number" && Number.isFinite(e) ? e : null;
}
function c(t, r) {
  const e = t?.[r];
  return B(e) ? e : null;
}
function xt(t, r) {
  const e = t[r];
  return Array.isArray(e) ? e.filter(B) : [];
}
function B(t) {
  return !!(t && typeof t == "object" && !Array.isArray(t));
}
function nt(t) {
  const r = [...t].sort(Lt), e = Ut(r), n = zt(r), i = Ot(r), o = Xt(r), u = Gt(r), d = Zt(r), m = it(d), y = Qt(r);
  return {
    orderedParts: e,
    actions: n,
    artifacts: i,
    evidence: o,
    diagnostics: u,
    task: {
      latestRuntimeStatus: d,
      terminal: m,
      collapsedByDefault: m,
      pendingActionCount: n.filter((E) => E.status === "pending").length,
      toolCallCount: te(r.map((E) => E.toolCallId)),
      artifactCount: i.length,
      evidenceCount: o.length,
      queueCount: r.filter((E) => E.type === "queue.changed").length
    },
    metrics: y,
    answerText: O(r, "text.delta"),
    reasoningText: O(r, "reasoning.delta")
  };
}
function Lt(t, r) {
  const e = t.sequence ?? Number.MAX_SAFE_INTEGER, n = r.sequence ?? Number.MAX_SAFE_INTEGER;
  return e !== n ? e - n : T(t).localeCompare(T(r));
}
function Ft(t) {
  const r = Kt(t), e = t.runtimeStatus ?? t.latestTurnStatus, n = Vt(t, r);
  return {
    id: T(t),
    kind: r,
    type: t.type,
    sequence: t.sequence ?? 0,
    label: n,
    displayName: k(t, "toolName"),
    preview: C(t),
    runtimeStatus: e,
    surface: t.surface,
    collapsedByDefault: at(t, r, e),
    toolCallId: t.toolCallId,
    actionId: t.actionId,
    artifactId: t.artifactId,
    evidenceId: t.evidenceId
  };
}
function Ut(t) {
  const r = [], e = /* @__PURE__ */ new Map();
  for (const n of t) {
    const i = Ft(n), o = Dt(n, i.kind);
    if (!o) {
      r.push(i);
      continue;
    }
    const u = e.get(o);
    if (!u) {
      const d = {
        ...i,
        id: o
      };
      e.set(o, d), r.push(d);
      continue;
    }
    u.preview = Bt(
      u.preview,
      i.preview,
      i.kind
    ), u.runtimeStatus = i.runtimeStatus ?? u.runtimeStatus, u.collapsedByDefault = at(
      n,
      i.kind,
      u.runtimeStatus
    ), u.displayName = u.displayName ?? i.displayName;
  }
  return r;
}
function Dt(t, r) {
  return r === "reasoning" && t.type === "reasoning.delta" ? `stream:reasoning:${z(t)}` : r === "text" && t.type === "text.delta" ? `stream:text:${z(t)}` : r === "tool" && t.toolCallId && (t.type === "tool.args.delta" || t.type === "tool.output.delta") ? `stream:tool:${t.toolCallId}` : null;
}
function z(t) {
  return [
    t.sessionId,
    t.threadId,
    t.runId,
    t.turnId,
    t.taskId,
    t.messageId
  ].filter((r) => !!r).join(":") || "unknown";
}
function Bt(t, r, e) {
  return r ? t && (e === "reasoning" || e === "text" || e === "tool") ? ot(t, r) : r : t;
}
function at(t, r, e) {
  return r === "text" ? !1 : r === "action" ? t.type === "action.resolved" : e === "running" || e === "needs_input" ? !1 : e && it(e) ? !0 : ["artifact", "evidence", "status", "queue"].includes(r);
}
function Kt(t) {
  return t.type.startsWith("text.") ? "text" : t.type.startsWith("reasoning.") ? "reasoning" : t.type.startsWith("tool.") ? "tool" : t.type.startsWith("action.") ? "action" : t.type.startsWith("artifact.") ? "artifact" : t.type.startsWith("evidence.") ? "evidence" : t.type.startsWith("queue.") ? "queue" : t.type.startsWith("diagnostic.") || t.type.startsWith("metric.") ? "diagnostic" : "status";
}
function Vt(t, r) {
  switch (r) {
    case "text":
      return "answer";
    case "reasoning":
      return "reasoning";
    case "tool":
      return "tool";
    case "action":
      return t.type === "action.resolved" ? "actionResolved" : "actionRequired";
    case "artifact":
      return "artifact";
    case "evidence":
      return "evidence";
    case "queue":
      return "queue";
    case "diagnostic":
      return "diagnostic";
    case "status":
    default:
      return "status";
  }
}
function zt(t) {
  const r = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.type.startsWith("action."))
      continue;
    const n = e.actionId ?? T(e);
    r.set(n, {
      actionId: n,
      sessionId: e.sessionId,
      threadId: e.threadId,
      runId: e.runId,
      turnId: e.turnId,
      taskId: e.taskId,
      actionType: k(e, "actionType"),
      status: e.type === "action.resolved" ? "resolved" : "pending",
      label: e.type === "action.resolved" ? "actionResolved" : "actionRequired",
      control: H(e)[0],
      controls: H(e),
      preview: C(e)
    });
  }
  return [...r.values()];
}
function H(t) {
  const r = t.payload?.controls, e = Array.isArray(r) ? r.filter(Ht) : [];
  return e.length > 0 ? [...new Set(e)] : t.control && t.control !== "none" ? [t.control] : [];
}
function Ht(t) {
  return typeof t == "string" && [
    "approve",
    "reject",
    "answer",
    "edit",
    "retry",
    "interrupt",
    "stop"
  ].includes(t);
}
function Ot(t) {
  const r = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.type.startsWith("artifact."))
      continue;
    const n = e.artifactId ?? T(e);
    r.set(n, {
      artifactId: n,
      label: "artifact",
      preview: C(e),
      ref: e.refs?.artifactPaths?.[0],
      status: e.runtimeStatus
    });
  }
  return [...r.values()];
}
function Xt(t) {
  const r = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.type.startsWith("evidence."))
      continue;
    const n = e.evidenceId ?? T(e);
    r.set(n, {
      evidenceId: n,
      label: "evidence",
      preview: C(e),
      status: e.runtimeStatus
    });
  }
  return [...r.values()];
}
function Gt(t) {
  const r = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.type.startsWith("diagnostic.") && !e.type.startsWith("metric."))
      continue;
    const n = e.diagnosticId ?? T(e);
    r.set(n, {
      diagnosticId: n,
      label: "diagnostic",
      preview: C(e),
      status: e.runtimeStatus
    });
  }
  return [...r.values()];
}
function Qt(t) {
  const r = {};
  for (const e of t) {
    if (!e.type.startsWith("metric."))
      continue;
    const n = e.payload ?? {}, i = k(e, "providerName"), o = k(e, "modelName"), u = X(n, "usage"), d = X(n, "cost"), m = _(u, "totalTokens") ?? _(u, "total_tokens"), y = Yt(d);
    i && (r.providerName = i), o && (r.modelName = o), typeof m == "number" && (r.tokenCount = m, r.tokenText = `${Jt(m)} tokens`), y && (r.costText = y);
  }
  return (r.modelName || r.providerName) && (r.modelLabel = [r.providerName, r.modelName].filter((e) => !!e).join(" / ")), r;
}
function O(t, r) {
  return t.filter((e) => e.type === r).map((e) => k(e, "preview")).filter((e) => !!e).reduce((e, n) => ot(e, n), "");
}
function Zt(t) {
  for (const r of [...t].reverse()) {
    const e = r.runtimeStatus ?? r.latestTurnStatus;
    if (e)
      return e;
  }
  return "unknown";
}
function it(t) {
  return ["completed", "failed", "cancelled", "aborted", "closed"].includes(t);
}
function C(t) {
  return k(t, "preview") ?? k(t, "status") ?? t.runtimeStatus;
}
function k(t, r) {
  const e = t.payload?.[r];
  return typeof e == "string" && e.trim() ? e.trim() : void 0;
}
function X(t, r) {
  const e = t[r];
  return e && typeof e == "object" && !Array.isArray(e) ? e : void 0;
}
function _(t, r) {
  const e = t?.[r];
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Jt(t) {
  return Math.round(t).toLocaleString("en-US");
}
function Yt(t) {
  if (!t)
    return;
  const r = _(t, "estimatedTotalCost") ?? _(t, "estimated_total_cost") ?? _(t, "totalCost") ?? _(t, "total_cost") ?? _(t, "total"), e = typeof t.currency == "string" && t.currency.trim() ? t.currency.trim() : "USD";
  if (typeof r == "number")
    return `${e} ${r.toFixed(r < 0.01 ? 4 : 2)}`;
  const n = typeof t.estimatedCostClass == "string" && t.estimatedCostClass.trim() ? t.estimatedCostClass.trim() : typeof t.estimated_cost_class == "string" && t.estimated_cost_class.trim() ? t.estimated_cost_class.trim() : void 0;
  return n || void 0;
}
function ot(t, r) {
  if (!t)
    return r;
  if (!r)
    return t;
  if (r.startsWith(t))
    return r;
  const e = /[A-Za-z0-9`)]$/.test(t) && /^[A-Za-z0-9`(]/.test(r);
  return `${t}${e ? " " : ""}${r}`;
}
function T(t) {
  return [
    t.rawEventRef,
    t.type,
    t.sequence,
    t.toolCallId,
    t.actionId,
    t.artifactId,
    t.evidenceId
  ].filter((r) => r != null && `${r}`.trim()).join(":");
}
function te(t) {
  return new Set(t.filter((r) => !!r)).size;
}
function ee(t, r = {}) {
  const e = re(t, r), n = st(t), i = J({
    ...e,
    events: n
  });
  return nt(i);
}
function st(t) {
  const r = W(t) ? t : {}, e = l(r, "runtimeFacts"), n = l(r, "task"), i = l(r, "snapshot");
  return [
    ...ct(r),
    ...ut(r, "root"),
    ...P(r, "root"),
    ...M(r, "runtimeFacts"),
    ...e ? P(e, "runtimeFacts") : [],
    ...M(r, "task"),
    ...n ? P(n, "task") : [],
    ...M(r, "snapshot"),
    ...i ? P(i, "snapshot") : []
  ];
}
function re(t, r) {
  const e = W(t) ? t : {}, n = l(e, "task"), i = l(e, "snapshot");
  return {
    appId: s(e, "appId") ?? s(e, "app_id"),
    taskId: s(e, "taskId") ?? s(n, "taskId") ?? s(i, "taskId"),
    sessionId: s(e, "sessionId") ?? s(n, "sessionId") ?? s(i, "sessionId"),
    threadId: s(e, "threadId") ?? s(n, "threadId") ?? s(i, "threadId"),
    runId: s(e, "runtimeEventName") ?? s(e, "runId") ?? s(n, "runtimeEventName") ?? s(i, "runtimeEventName"),
    turnId: s(e, "turnId") ?? s(n, "turnId") ?? s(i, "turnId"),
    timestamp: s(e, "updatedAt") ?? s(e, "openedAt") ?? s(i, "updatedAt"),
    startSequence: r.startSequence
  };
}
function M(t, r) {
  const e = l(t, r);
  return e ? [
    ...ct(e),
    ...ut(e, r)
  ] : [];
}
function ct(t) {
  return [
    ...N(t, "events"),
    ...N(t, "taskEvents"),
    ...N(t, "agentUiEvents"),
    ...N(t, "projectionEvents")
  ];
}
function N(t, r) {
  const e = t[r];
  return Array.isArray(e) ? e : [];
}
function ut(t, r) {
  const e = l(t, "runtimeProcess") ?? l(t, "process");
  return e ? N(e, "timeline").map(
    (n, i) => ne(n, i, r)
  ).filter((n) => !!n) : [];
}
function P(t, r) {
  const e = l(t, "runtimeProcess") ?? l(t, "process"), n = G(t) ?? G(e), i = Q(t) ?? Q(e), o = Z(t) ?? Z(e);
  return !n && !i && !o ? [] : [{
    id: `${r}:runtime-metrics`,
    eventType: "task:metricChanged",
    status: "recorded",
    payload: {
      metricName: "runtime_usage_cost",
      providerName: n?.providerName,
      modelName: n?.modelName,
      usage: i,
      cost: o
    }
  }];
}
function G(t) {
  if (!t)
    return null;
  const r = l(t, "modelRouting"), e = $(q(r ?? {}, "routes")), n = e ? l(e, "model") ?? e : null, i = l(t, "models"), o = $(q(i ?? {}, "models")), u = l(t, "model"), d = n ?? o ?? u ?? t, m = s(d, "provider") ?? s(d, "providerName") ?? s(d, "selectedProvider"), y = s(d, "model") ?? s(d, "modelName") ?? s(d, "selectedModel") ?? s(d, "label");
  return m || y ? {
    providerName: m ?? void 0,
    modelName: y ?? void 0
  } : null;
}
function Q(t) {
  if (!t)
    return null;
  const r = l(t, "tokenUsage");
  return l(r ?? {}, "totals") ?? l($(q(r ?? {}, "tasks")) ?? {}, "usage") ?? l(t, "usage");
}
function Z(t) {
  if (!t)
    return null;
  const r = l(t, "costSummary");
  return l(r ?? {}, "cost") ?? l($(q(r ?? {}, "tasks")) ?? {}, "cost") ?? l(t, "cost");
}
function q(t, r) {
  const e = t[r];
  return Array.isArray(e) ? e : [];
}
function $(t) {
  return t.find(W) ?? null;
}
function ne(t, r, e) {
  if (!W(t))
    return null;
  const n = s(t, "kind") ?? "progress", i = s(t, "title"), o = s(t, "message") ?? i, u = s(t, "status") ?? s(t, "statusText") ?? s(t, "state"), d = s(t, "id") ?? s(t, "eventId") ?? `${e}:timeline:${r}`, m = {
    source: "runtimeProcess.timeline",
    timelineKind: n,
    title: i
  };
  if (n === "tool" || n === "skill") {
    const y = ae(t, i, n);
    return !y && !o ? null : {
      id: d,
      eventType: "task:toolCall",
      status: u,
      message: o,
      toolName: y,
      toolCallId: s(t, "toolCallId") ?? s(t, "callId") ?? s(t, "toolId") ?? d,
      payload: m
    };
  }
  return n === "output" ? {
    id: d,
    eventType: "task:partialArtifact",
    status: u,
    message: o,
    payload: {
      ...m,
      streamKind: "assistant_text_delta",
      delta: o
    }
  } : n === "thinking" || n === "reasoning" ? {
    id: d,
    eventType: "task:partialArtifact",
    status: u,
    message: o,
    payload: {
      ...m,
      streamKind: "thinking_delta",
      delta: o
    }
  } : !o && !u ? null : {
    id: d,
    eventType: "task:status",
    status: u,
    message: o,
    payload: m
  };
}
function ae(t, r, e) {
  const n = s(t, "toolName") ?? s(t, "tool_name") ?? s(t, "name") ?? s(t, "tool");
  if (n)
    return e === "skill" && !n.startsWith("Skill(") ? `Skill(${n})` : n;
  const o = r?.match(/^(?:工具|Tool|技能|Skill)\s*·\s*(.+)$/)?.[1]?.trim();
  if (o)
    return e === "skill" ? `Skill(${o})` : o;
}
function s(t, r) {
  const e = t?.[r];
  return typeof e == "string" && e.trim() ? e.trim() : null;
}
function l(t, r) {
  const e = t[r];
  return W(e) ? e : null;
}
function W(t) {
  return !!(t && typeof t == "object" && !Array.isArray(t));
}
function ie(t = {}) {
  return J(t);
}
function oe(t) {
  return nt(t);
}
function dt(t, r = {}) {
  return ee(
    t,
    r
  );
}
function se(t) {
  return st(t);
}
const ge = ie, ye = oe, he = dt, Ie = se, ce = `
[data-lime-agent-run-projection] {
  --lime-agent-run-bg: #f8fafc;
  --lime-agent-run-card: #ffffff;
  --lime-agent-run-border: #d8dee8;
  --lime-agent-run-muted: #667085;
  --lime-agent-run-text: #172033;
  --lime-agent-run-accent: #2364aa;
  display: grid;
  gap: 0.75rem;
  color: var(--lime-agent-run-text);
}
[data-lime-agent-run-projection-summary] {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
  gap: 0.5rem;
}
[data-lime-agent-run-projection-summary-item],
[data-lime-agent-run-projection-part],
[data-lime-agent-run-projection-action],
[data-lime-agent-run-projection-artifacts] article,
[data-lime-agent-run-projection-evidence] article,
[data-lime-agent-run-projection-diagnostics] article {
  border: 1px solid var(--lime-agent-run-border);
  border-radius: 0.875rem;
  background: var(--lime-agent-run-card);
}
[data-lime-agent-run-projection-summary-item] {
  display: grid;
  gap: 0.125rem;
  padding: 0.625rem 0.75rem;
}
[data-lime-agent-run-projection-summary-item] strong,
[data-lime-agent-run-projection-part] summary {
  font-weight: 650;
}
[data-lime-agent-run-projection-summary-item] em,
[data-lime-agent-run-projection-part-status] {
  color: var(--lime-agent-run-muted);
  font-style: normal;
}
[data-lime-agent-run-projection-part] summary {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
}
[data-lime-agent-run-projection-part-preview] {
  border-top: 1px solid var(--lime-agent-run-border);
  padding: 0.625rem 0.75rem;
  line-height: 1.6;
  white-space: pre-wrap;
}
[data-lime-agent-run-projection-actions],
[data-lime-agent-run-projection-artifacts],
[data-lime-agent-run-projection-evidence],
[data-lime-agent-run-projection-diagnostics] {
  display: grid;
  gap: 0.5rem;
}
[data-lime-agent-run-projection-action],
[data-lime-agent-run-projection-artifacts] article,
[data-lime-agent-run-projection-evidence] article,
[data-lime-agent-run-projection-diagnostics] article {
  padding: 0.625rem 0.75rem;
}
[data-lime-agent-run-projection-empty] {
  border: 1px dashed var(--lime-agent-run-border);
  border-radius: 0.875rem;
  padding: 0.875rem;
  color: var(--lime-agent-run-muted);
  background: var(--lime-agent-run-bg);
}
`.trim(), x = {
  parts: {
    status: "Status",
    queue: "Queue",
    answer: "Answer",
    reasoning: "Thinking",
    tool: "Tool",
    actionRequired: "Action required",
    actionResolved: "Action resolved",
    artifact: "Artifact",
    evidence: "Evidence",
    diagnostic: "Diagnostic"
  },
  summary: {
    status: "Status",
    model: "Model",
    tokens: "Tokens",
    cost: "Cost",
    pendingActions: "Actions",
    tools: "Tools",
    artifacts: "Artifacts",
    evidence: "Evidence",
    queue: "Queue"
  },
  empty: "No AgentRuntime process yet."
};
function ue(t, r = {}) {
  const { startSequence: e, ...n } = r;
  return lt(
    dt(t, { startSequence: e }),
    n
  );
}
function lt(t, r = {}) {
  const e = le(r.labels), n = r.className ?? "lime-agent-run-projection", i = t.orderedParts.length > 0 ? t.orderedParts.map((u) => fe(u, e)).join("") : `<p data-lime-agent-run-projection-empty>${g(e.empty)}</p>`;
  return [
    r.includeStyles ? de(r.styleNonce) : "",
    `<section class="${j(n)}" data-lime-agent-run-projection data-terminal="${t.task.terminal ? "true" : "false"}">`,
    me(t, e),
    `<div data-lime-agent-run-projection-parts>${i}</div>`,
    pe(t, e),
    L("artifacts", t.artifacts, e.summary.artifacts),
    L("evidence", t.evidence, e.summary.evidence),
    L("diagnostics", t.diagnostics, e.parts.diagnostic),
    "</section>"
  ].join("");
}
function de(t) {
  return `<style data-lime-agent-run-projection-style${t ? ` nonce="${j(t)}"` : ""}>${ce}</style>`;
}
function le(t = {}) {
  return {
    parts: { ...x.parts, ...t.parts ?? {} },
    summary: { ...x.summary, ...t.summary ?? {} },
    empty: t.empty ?? x.empty
  };
}
function me(t, r) {
  const e = t.metrics ?? {};
  return `<div data-lime-agent-run-projection-summary>${[
    [r.summary.status, t.task.latestRuntimeStatus],
    e.modelLabel ? [r.summary.model, e.modelLabel] : null,
    e.tokenText ? [r.summary.tokens, e.tokenText] : null,
    e.costText ? [r.summary.cost, e.costText] : null,
    [r.summary.pendingActions, t.task.pendingActionCount],
    [r.summary.tools, t.task.toolCallCount],
    [r.summary.artifacts, t.task.artifactCount],
    [r.summary.evidence, t.task.evidenceCount],
    [r.summary.queue, t.task.queueCount]
  ].filter((i) => !!i).map(
    ([i, o]) => `<span data-lime-agent-run-projection-summary-item><strong>${g(String(i))}</strong><em>${g(String(o))}</em></span>`
  ).join("")}</div>`;
}
function fe(t, r) {
  const e = t.displayName ?? r.parts[t.label], n = t.collapsedByDefault ? "" : " open", i = t.runtimeStatus ? `<span data-lime-agent-run-projection-part-status>${g(t.runtimeStatus)}</span>` : "", o = t.preview ? `<div data-lime-agent-run-projection-part-preview>${g(t.preview)}</div>` : "";
  return [
    `<details data-lime-agent-run-projection-part data-kind="${j(t.kind)}" data-type="${j(t.type)}"${n}>`,
    `<summary><span>${g(e)}</span>${i}</summary>`,
    o,
    "</details>"
  ].join("");
}
function pe(t, r) {
  return t.actions.length === 0 ? "" : `<div data-lime-agent-run-projection-actions>${t.actions.map(
    (e) => `<article data-lime-agent-run-projection-action data-status="${j(e.status)}"><strong>${g(r.parts[e.label])}</strong>${e.preview ? `<p>${g(e.preview)}</p>` : ""}</article>`
  ).join("")}</div>`;
}
function L(t, r, e) {
  return r.length === 0 ? "" : `<div data-lime-agent-run-projection-${j(t)}><strong>${g(e)}</strong>${r.map(
    (n) => `<article>${n.preview ? `<span>${g(n.preview)}</span>` : ""}${n.status ? `<em>${g(n.status)}</em>` : ""}</article>`
  ).join("")}</div>`;
}
function g(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function j(t) {
  return g(t);
}
function _e(t, r, e = {}) {
  const n = lt(r, e);
  return t.innerHTML = n, n;
}
function ke(t, r, e = {}) {
  const n = ue(r, e);
  return t.innerHTML = n, n;
}
export {
  ce as LIME_AGENT_RUN_PROJECTION_DEFAULT_CSS,
  ge as buildAgentAppAgentUiProjectionEvents,
  ye as buildAgentAppRunProjectionViewModel,
  he as buildAgentRunProjectionViewModelFromState,
  oe as buildLimeAgentRunProjectionViewModel,
  dt as buildLimeAgentRunProjectionViewModelFromState,
  ie as buildLimeAgentUiProjectionEvents,
  Ie as collectAgentRunProjectionSourceEvents,
  se as collectLimeAgentRunProjectionSourceEvents,
  _e as mountLimeAgentRunProjectionHtml,
  ke as mountLimeAgentRunProjectionState,
  lt as renderLimeAgentRunProjectionHtml,
  ue as renderLimeAgentRunProjectionStateHtml,
  de as renderLimeAgentRunProjectionStyleTag
};
