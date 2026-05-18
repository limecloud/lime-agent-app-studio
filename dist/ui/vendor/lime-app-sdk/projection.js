function K({
  events: t = [],
  ...r
} = {}) {
  return t.flatMap(
    (i) => z(i, r)
  ).map(({ event: i, inherited: s }) => nt(i, s)).filter(
    (i) => !!i
  ).map((i, s) => ({
    ...i,
    sequence: typeof r.startSequence == "number" ? r.startSequence + s : s + 1
  }));
}
function z(t, r) {
  if (!F(t))
    return [];
  const e = {
    ...r,
    sessionId: a(t, "sessionId") ?? r.sessionId,
    threadId: a(t, "threadId") ?? r.threadId,
    turnId: a(t, "turnId") ?? r.turnId,
    taskId: a(t, "taskId") ?? r.taskId,
    runId: a(t, "runtimeEventName") ?? r.runId,
    timestamp: a(t, "occurredAt") ?? a(t, "emittedAt") ?? r.timestamp
  }, n = Wt(t, "taskEvents");
  return n.length > 0 ? n.flatMap(
    (i) => z(i, e)
  ) : [{ event: t, inherited: e }];
}
function nt(t, r) {
  const e = a(t, "eventType") ?? a(t, "type"), n = pt(e);
  if (n)
    return at(t, r, n);
  const i = Tt(t);
  if (i)
    return it(t, r, i);
  switch (e) {
    case "task:queued":
      return d(t, r, {
        type: "queue.changed",
        sourceType: "queue_added",
        phase: "submitted",
        surface: "task_capsule",
        runtimeStatus: "queued",
        control: "queue"
      });
    case "task:toolCall":
      return st(t, r);
    case "task:reviewRequested":
    case "task:missingContextRequested":
    case "task:blocked":
      return M(t, r, "action.required");
    case "task:reviewResolved":
      return M(t, r, "action.resolved");
    case "artifact:created":
      return ot(t, r);
    case "evidence:recorded":
    case "evidence:verified":
      return ct(t, r);
    case "metric.changed":
    case "task:metricChanged":
    case "task:costEstimated":
    case "task:costRecorded":
      return ut(t, r);
    case "diagnostic.changed":
    case "task:diagnostic":
    case "task:warning":
      return dt(t, r);
    case "task:completed":
      return d(t, r, {
        type: "run.finished",
        sourceType: "runtime_status",
        phase: "completed",
        surface: "runtime_status",
        runtimeStatus: "completed",
        persistence: "archive"
      });
    case "task:error":
      return d(t, r, {
        type: "run.failed",
        sourceType: "runtime_status",
        phase: "failed",
        surface: "runtime_status",
        runtimeStatus: "failed",
        persistence: "archive"
      });
    case "task:cancelled":
      return d(t, r, {
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
      return x(t, r);
    default:
      return e ? x(t, r) : null;
  }
}
function at(t, r, e) {
  const n = c(t, "payload") ?? {}, i = [
    ...k(t, "controls"),
    ...k(n, "controls")
  ].filter(L);
  return d(t, r, {
    type: e,
    sourceType: gt(e),
    phase: ht(e),
    surface: yt(e),
    runtimeStatus: It(e, t),
    persistence: _t(e),
    toolCallId: a(t, "toolCallId") ?? W(t),
    actionId: a(t, "actionId") ?? N(t),
    artifactId: a(t, "artifactId") ?? H(t),
    evidenceId: a(t, "evidenceId") ?? O(t),
    partId: a(t, "partId") ?? h(t),
    diagnosticId: a(t, "diagnosticId") ?? h(t),
    control: kt(t),
    refs: c(t, "refs") ?? void 0,
    payload: {
      ...n,
      controls: i.length > 0 ? V(i) : n.controls,
      preview: a(n, "preview") ?? f(a(t, "message"))
    }
  });
}
function it(t, r, e) {
  const n = jt(t);
  return e === "thinking_delta" ? d(t, r, {
    type: "reasoning.delta",
    sourceType: "thinking_delta",
    phase: "reasoning",
    surface: "inline_process",
    runtimeStatus: "running",
    persistence: "ephemeral_live",
    partId: h(t),
    payload: {
      streamKind: e,
      preview: f(n),
      textLength: n.length
    }
  }) : e === "tool_input_delta" ? d(t, r, {
    type: "tool.args.delta",
    sourceType: "tool_input_delta",
    phase: "acting",
    surface: "tool_ui",
    runtimeStatus: "running",
    persistence: "ephemeral_live",
    toolCallId: W(t),
    payload: {
      streamKind: e,
      toolName: v(t),
      preview: f(n),
      textLength: n.length
    }
  }) : e === "tool_output_delta" ? d(t, r, {
    type: "tool.output.delta",
    sourceType: "tool_output_delta",
    phase: "acting",
    surface: "tool_ui",
    runtimeStatus: "running",
    persistence: "ephemeral_live",
    toolCallId: W(t),
    payload: {
      streamKind: e,
      toolName: v(t),
      preview: f(n),
      textLength: n.length
    }
  }) : d(t, r, {
    type: "text.delta",
    sourceType: "text_delta",
    phase: "producing",
    surface: "conversation",
    runtimeStatus: "running",
    persistence: "transcript",
    partId: h(t),
    payload: {
      streamKind: e,
      preview: f(n),
      textLength: n.length
    }
  });
}
function st(t, r) {
  const e = S(a(t, "status")), n = e === "failed", i = e === "completed";
  return d(t, r, {
    type: n ? "tool.failed" : i ? "tool.result" : "tool.started",
    sourceType: n || i ? "tool_end" : "tool_start",
    phase: n ? "failed" : i ? "completed" : "acting",
    surface: "tool_ui",
    runtimeStatus: n ? "failed" : i ? "completed" : "running",
    persistence: i || n ? "archive" : "ephemeral_live",
    toolCallId: W(t),
    payload: {
      toolName: v(t),
      status: e,
      preview: f(a(t, "message")),
      payloadKeys: _(t)
    }
  });
}
function M(t, r, e) {
  const n = e === "action.required", i = c(t, "payload"), s = a(t, "eventType"), u = n ? At(t) : [];
  return d(t, r, {
    type: e,
    sourceType: n ? "action_required" : "action_resolved",
    phase: n ? "waiting" : "completed",
    surface: "hitl",
    runtimeStatus: n ? "needs_input" : "completed",
    persistence: n ? "snapshot" : "archive",
    actionId: N(t),
    control: n ? u[0] : "none",
    payload: {
      status: a(t, "status"),
      requestId: N(t),
      actionType: a(t, "actionType") ?? a(i, "actionType") ?? St(s),
      controls: u,
      preview: f(a(t, "message")),
      payloadKeys: _(t)
    }
  });
}
function ot(t, r) {
  const e = S(a(t, "status")), n = a(t, "artifactRef") ?? wt(t), i = Et(t);
  return d(t, r, {
    type: e === "failed" ? "artifact.failed" : "artifact.created",
    sourceType: "artifact_snapshot",
    phase: e === "failed" ? "failed" : "completed",
    surface: "artifact_workspace",
    runtimeStatus: e === "failed" ? "failed" : "completed",
    persistence: "artifact_store",
    artifactId: H(t) ?? n,
    refs: n ? { artifactPaths: [n] } : void 0,
    payload: {
      status: e,
      artifactRef: n,
      preview: f(i),
      payloadKeys: _(t)
    }
  });
}
function ct(t, r) {
  const e = a(t, "evidenceRef") ?? O(t);
  return d(t, r, {
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
      preview: f(a(t, "message")),
      payloadKeys: _(t)
    }
  });
}
function ut(t, r) {
  const e = c(t, "payload"), n = S(a(t, "status"));
  return d(t, r, {
    type: "metric.changed",
    sourceType: "performance_metric",
    phase: "acting",
    surface: "diagnostics",
    runtimeStatus: q(n),
    persistence: "diagnostics_log",
    payload: {
      metricName: a(t, "metricName") ?? a(e, "metricName") ?? a(e, "metric") ?? a(t, "eventType"),
      status: n,
      providerName: a(t, "providerName") ?? a(e, "providerName"),
      modelName: a(t, "modelName") ?? a(e, "modelName") ?? a(e, "model"),
      preview: f(a(t, "message")) ?? f(a(e, "preview")) ?? bt(t),
      usage: c(t, "usage") ?? c(e, "usage"),
      cost: c(t, "cost") ?? c(e, "cost"),
      payloadKeys: _(t)
    }
  });
}
function dt(t, r) {
  const e = S(a(t, "status"));
  return d(t, r, {
    type: "diagnostic.changed",
    sourceType: "runtime_status",
    phase: e === "failed" ? "failed" : "acting",
    surface: "diagnostics",
    runtimeStatus: q(e),
    persistence: "diagnostics_log",
    diagnosticId: h(t),
    payload: {
      status: e,
      code: a(t, "code") ?? a(c(t, "payload"), "code"),
      preview: f(a(t, "message")),
      payloadKeys: _(t)
    }
  });
}
function x(t, r) {
  const e = S(a(t, "status"));
  return d(t, r, {
    type: e === "failed" ? "run.failed" : "run.status",
    sourceType: "runtime_status",
    phase: mt(e),
    surface: "runtime_status",
    runtimeStatus: q(e),
    persistence: e === "completed" || e === "failed" ? "archive" : "ephemeral_live",
    payload: {
      status: e,
      eventType: a(t, "eventType") ?? a(t, "type"),
      preview: f(a(t, "message")),
      payloadKeys: _(t)
    }
  });
}
function d(t, r, e) {
  const n = h(t), i = a(t, "occurredAt") ?? r.timestamp ?? void 0;
  return {
    sourceType: e.sourceType,
    type: e.type,
    timestamp: i,
    sessionId: y(r.sessionId),
    threadId: a(t, "threadId") ?? y(r.threadId),
    runId: y(r.runId),
    turnId: a(t, "turnId") ?? y(r.turnId),
    taskId: a(t, "taskId") ?? y(r.taskId),
    owner: lt(e.type),
    scope: ft(e.type),
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
      appId: y(r.appId),
      taskId: a(t, "taskId") ?? y(r.taskId),
      sourceEventId: n,
      ...e.payload
    }
  };
}
function lt(t) {
  return t.startsWith("text.") || t.startsWith("reasoning.") ? "model" : t.startsWith("tool.") ? "tool" : t.startsWith("action.") ? "action" : t.startsWith("artifact.") ? "artifact" : t.startsWith("evidence.") ? "evidence" : t.startsWith("diagnostic.") || t.startsWith("metric.") ? "diagnostics" : t.startsWith("queue.") || t.startsWith("task.") ? "task" : "runtime";
}
function ft(t) {
  return t.startsWith("text.") || t.startsWith("reasoning.") ? "part" : t.startsWith("tool.") ? "tool_call" : t.startsWith("action.") ? "action_request" : t.startsWith("artifact.") ? "artifact" : t.startsWith("evidence.") ? "evidence" : t.startsWith("diagnostic.") || t.startsWith("metric.") ? "run" : t.startsWith("queue.") ? "task" : "run";
}
function mt(t) {
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
function q(t) {
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
function pt(t) {
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
function gt(t) {
  return t.startsWith("metric.") ? "performance_metric" : t.startsWith("evidence.") ? "evidence_projection" : t.startsWith("artifact.") ? "artifact_snapshot" : t === "tool.started" || t === "tool.args" ? "tool_start" : t === "tool.result" || t === "tool.failed" ? "tool_end" : t === "tool.progress" ? "tool_progress" : t === "tool.output.delta" ? "tool_output_delta" : t === "tool.args.delta" ? "tool_input_delta" : t === "text.delta" || t === "text.final" ? "text_delta" : t.startsWith("reasoning.") ? "thinking_delta" : t === "action.required" ? "action_required" : t === "action.resolved" ? "action_resolved" : "runtime_status";
}
function ht(t) {
  return t.startsWith("text.") ? "producing" : t.startsWith("reasoning.") ? "reasoning" : t.startsWith("tool.") ? t === "tool.failed" ? "failed" : t === "tool.result" ? "completed" : "acting" : t === "action.required" ? "waiting" : t === "action.resolved" ? "completed" : t.startsWith("artifact.") || t.startsWith("evidence.") ? t.endsWith(".failed") ? "failed" : "completed" : t === "run.finished" ? "completed" : t === "run.failed" ? "failed" : t.startsWith("queue.") ? "submitted" : "acting";
}
function yt(t) {
  return t.startsWith("text.") ? "conversation" : t.startsWith("reasoning.") ? "inline_process" : t.startsWith("tool.") ? "tool_ui" : t.startsWith("action.") ? "hitl" : t.startsWith("artifact.") ? "artifact_workspace" : t.startsWith("evidence.") ? "timeline_evidence" : t.startsWith("diagnostic.") || t.startsWith("metric.") ? "diagnostics" : t.startsWith("queue.") || t.startsWith("task.") ? "task_capsule" : "runtime_status";
}
function It(t, r) {
  const e = a(r, "runtimeStatus") ?? a(r, "status");
  return e ? q(S(e)) : t === "run.finished" || t === "tool.result" || t === "action.resolved" ? "completed" : t === "run.failed" || t === "tool.failed" || t.endsWith(".failed") ? "failed" : t === "action.required" ? "needs_input" : t.startsWith("text.") || t.startsWith("reasoning.") || t.startsWith("tool.") ? "running" : "unknown";
}
function _t(t) {
  return t.startsWith("text.") ? "transcript" : t.startsWith("artifact.") ? "artifact_store" : t.startsWith("evidence.") ? "evidence_pack" : t.startsWith("diagnostic.") || t.startsWith("metric.") ? "diagnostics_log" : t === "run.finished" || t === "run.failed" || t === "tool.result" || t === "tool.failed" || t === "action.resolved" ? "archive" : "ephemeral_live";
}
function kt(t) {
  const r = a(t, "control");
  return r === "none" ? "none" : r && L(r) ? r : void 0;
}
function At(t) {
  const r = c(t, "payload"), e = [
    ...k(t, "controls"),
    ...k(t, "allowedControls"),
    ...k(r, "controls"),
    ...k(r, "allowedControls")
  ].filter(L);
  if (e.length > 0)
    return V(e);
  const n = a(t, "eventType");
  return n === "task:missingContextRequested" ? ["answer"] : n === "task:blocked" ? ["answer"] : n === "task:reviewRequested" ? ["approve", "reject"] : ["approve"];
}
function St(t) {
  return "ask_user";
}
function L(t) {
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
function V(t) {
  return [...new Set(t)];
}
function Tt(t) {
  const r = c(t, "payload"), e = c(r, "runtimeEvent");
  return a(r, "streamKind") ?? a(t, "streamKind") ?? a(e, "type");
}
function jt(t) {
  const r = c(t, "payload"), e = c(r, "runtimeEvent");
  return a(r, "delta") ?? a(r, "text") ?? a(e, "text") ?? a(e, "delta") ?? a(t, "message") ?? "";
}
function v(t) {
  const r = c(t, "payload"), e = c(r, "runtimeEvent"), n = c(e, "result"), i = c(n, "metadata"), s = a(i, "skill_name") ?? a(i, "skillName");
  return s ? `Skill(${s})` : a(t, "toolName") ?? a(t, "tool_name") ?? a(r, "tool_name") ?? a(r, "toolName") ?? a(e, "tool_name") ?? a(e, "toolName") ?? a(e, "tool_id") ?? void 0;
}
function W(t) {
  const r = c(t, "payload"), e = c(r, "runtimeEvent");
  return a(t, "toolId") ?? a(t, "toolCallId") ?? a(r, "tool_call_id") ?? a(r, "toolCallId") ?? a(r, "tool_id") ?? a(e, "tool_id") ?? a(e, "toolId") ?? h(t) ?? void 0;
}
function N(t) {
  const r = c(t, "payload");
  return a(t, "requestId") ?? a(t, "actionId") ?? a(r, "request_id") ?? a(r, "requestId") ?? h(t) ?? void 0;
}
function H(t) {
  const r = c(t, "payload"), e = c(r, "artifact");
  return a(t, "artifactId") ?? a(e, "artifact_id") ?? a(e, "artifactId") ?? a(e, "item_id") ?? a(e, "itemId") ?? void 0;
}
function wt(t) {
  const r = c(t, "payload"), e = c(r, "artifact");
  return a(t, "artifactRef") ?? a(r, "artifactRef") ?? a(e, "path") ?? a(e, "file_path") ?? a(e, "filePath") ?? void 0;
}
function Et(t) {
  const r = c(t, "payload"), e = c(r, "artifact");
  return a(t, "message") ?? a(r, "message") ?? a(r, "title") ?? a(e, "title") ?? a(e, "name") ?? void 0;
}
function O(t) {
  const r = c(t, "payload");
  return a(t, "evidenceRef") ?? a(r, "evidenceRef") ?? a(r, "evidence_id") ?? a(r, "evidenceId") ?? void 0;
}
function h(t) {
  return a(t, "id") ?? a(t, "eventId") ?? void 0;
}
function _(t) {
  const r = c(t, "payload");
  if (!r)
    return;
  const e = Object.keys(r).sort();
  return e.length ? e : void 0;
}
function bt(t) {
  const r = c(t, "payload"), e = c(t, "usage") ?? c(r, "usage"), n = c(t, "cost") ?? c(r, "cost"), i = a(t, "modelName") ?? a(r, "modelName") ?? a(r, "model"), s = T(e, "totalTokens") ?? T(e, "total_tokens"), u = T(n, "total") ?? T(n, "estimatedTotalCost") ?? T(n, "estimated_total_cost"), l = [
    i,
    typeof s == "number" ? `${s} tokens` : void 0,
    typeof u == "number" ? `${u}` : void 0
  ].filter((p) => !!p);
  return l.length ? l.join(" · ") : void 0;
}
function S(t) {
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
function f(t) {
  const r = t?.trim();
  if (r)
    return r.length <= 160 ? r : `${r.slice(0, 160).trim()}...`;
}
function y(t) {
  return t?.trim() || void 0;
}
function a(t, r) {
  const e = t?.[r];
  return typeof e == "string" && e.trim() ? e.trim() : null;
}
function k(t, r) {
  const e = t?.[r];
  return Array.isArray(e) ? e.filter((n) => typeof n == "string") : [];
}
function T(t, r) {
  const e = t?.[r];
  return typeof e == "number" && Number.isFinite(e) ? e : null;
}
function c(t, r) {
  const e = t?.[r];
  return F(e) ? e : null;
}
function Wt(t, r) {
  const e = t[r];
  return Array.isArray(e) ? e.filter(F) : [];
}
function F(t) {
  return !!(t && typeof t == "object" && !Array.isArray(t));
}
function X(t) {
  const r = [...t].sort(qt), e = Rt(r), n = Lt(r), i = Mt(r), s = xt(r), u = Dt(r), l = Bt(r), p = Q(l);
  return {
    orderedParts: e,
    actions: n,
    artifacts: i,
    evidence: s,
    diagnostics: u,
    task: {
      latestRuntimeStatus: l,
      terminal: p,
      collapsedByDefault: p,
      pendingActionCount: n.filter((g) => g.status === "pending").length,
      toolCallCount: Ut(r.map((g) => g.toolCallId)),
      artifactCount: i.length,
      evidenceCount: s.length,
      queueCount: r.filter((g) => g.type === "queue.changed").length
    },
    answerText: U(r, "text.delta"),
    reasoningText: U(r, "reasoning.delta")
  };
}
function qt(t, r) {
  const e = t.sequence ?? Number.MAX_SAFE_INTEGER, n = r.sequence ?? Number.MAX_SAFE_INTEGER;
  return e !== n ? e - n : I(t).localeCompare(I(r));
}
function Pt(t) {
  const r = vt(t), e = t.runtimeStatus ?? t.latestTurnStatus, n = Nt(t, r);
  return {
    id: I(t),
    kind: r,
    type: t.type,
    sequence: t.sequence ?? 0,
    label: n,
    displayName: w(t, "toolName"),
    preview: b(t),
    runtimeStatus: e,
    surface: t.surface,
    collapsedByDefault: G(t, r, e),
    toolCallId: t.toolCallId,
    actionId: t.actionId,
    artifactId: t.artifactId,
    evidenceId: t.evidenceId
  };
}
function Rt(t) {
  const r = [], e = /* @__PURE__ */ new Map();
  for (const n of t) {
    const i = Pt(n), s = Ct(n, i.kind);
    if (!s) {
      r.push(i);
      continue;
    }
    const u = e.get(s);
    if (!u) {
      const l = {
        ...i,
        id: s
      };
      e.set(s, l), r.push(l);
      continue;
    }
    u.preview = $t(
      u.preview,
      i.preview,
      i.kind
    ), u.runtimeStatus = i.runtimeStatus ?? u.runtimeStatus, u.collapsedByDefault = G(
      n,
      i.kind,
      u.runtimeStatus
    ), u.displayName = u.displayName ?? i.displayName;
  }
  return r;
}
function Ct(t, r) {
  return r === "reasoning" && t.type === "reasoning.delta" ? `stream:reasoning:${D(t)}` : r === "text" && t.type === "text.delta" ? `stream:text:${D(t)}` : r === "tool" && t.toolCallId && (t.type === "tool.args.delta" || t.type === "tool.output.delta") ? `stream:tool:${t.toolCallId}` : null;
}
function D(t) {
  return [
    t.sessionId,
    t.threadId,
    t.runId,
    t.turnId,
    t.taskId,
    t.messageId
  ].filter((r) => !!r).join(":") || "unknown";
}
function $t(t, r, e) {
  return r ? t && (e === "reasoning" || e === "text" || e === "tool") ? Z(t, r) : r : t;
}
function G(t, r, e) {
  return r === "text" ? !1 : r === "action" ? t.type === "action.resolved" : e === "running" || e === "needs_input" ? !1 : e && Q(e) ? !0 : ["artifact", "evidence", "status", "queue"].includes(r);
}
function vt(t) {
  return t.type.startsWith("text.") ? "text" : t.type.startsWith("reasoning.") ? "reasoning" : t.type.startsWith("tool.") ? "tool" : t.type.startsWith("action.") ? "action" : t.type.startsWith("artifact.") ? "artifact" : t.type.startsWith("evidence.") ? "evidence" : t.type.startsWith("queue.") ? "queue" : t.type.startsWith("diagnostic.") || t.type.startsWith("metric.") ? "diagnostic" : "status";
}
function Nt(t, r) {
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
function Lt(t) {
  const r = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.type.startsWith("action."))
      continue;
    const n = e.actionId ?? I(e);
    r.set(n, {
      actionId: n,
      sessionId: e.sessionId,
      threadId: e.threadId,
      runId: e.runId,
      turnId: e.turnId,
      taskId: e.taskId,
      actionType: w(e, "actionType"),
      status: e.type === "action.resolved" ? "resolved" : "pending",
      label: e.type === "action.resolved" ? "actionResolved" : "actionRequired",
      control: B(e)[0],
      controls: B(e),
      preview: b(e)
    });
  }
  return [...r.values()];
}
function B(t) {
  const r = t.payload?.controls, e = Array.isArray(r) ? r.filter(Ft) : [];
  return e.length > 0 ? [...new Set(e)] : t.control && t.control !== "none" ? [t.control] : [];
}
function Ft(t) {
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
function Mt(t) {
  const r = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.type.startsWith("artifact."))
      continue;
    const n = e.artifactId ?? I(e);
    r.set(n, {
      artifactId: n,
      label: "artifact",
      preview: b(e),
      ref: e.refs?.artifactPaths?.[0],
      status: e.runtimeStatus
    });
  }
  return [...r.values()];
}
function xt(t) {
  const r = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.type.startsWith("evidence."))
      continue;
    const n = e.evidenceId ?? I(e);
    r.set(n, {
      evidenceId: n,
      label: "evidence",
      preview: b(e),
      status: e.runtimeStatus
    });
  }
  return [...r.values()];
}
function Dt(t) {
  const r = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.type.startsWith("diagnostic.") && !e.type.startsWith("metric."))
      continue;
    const n = e.diagnosticId ?? I(e);
    r.set(n, {
      diagnosticId: n,
      label: "diagnostic",
      preview: b(e),
      status: e.runtimeStatus
    });
  }
  return [...r.values()];
}
function U(t, r) {
  return t.filter((e) => e.type === r).map((e) => w(e, "preview")).filter((e) => !!e).reduce((e, n) => Z(e, n), "");
}
function Bt(t) {
  for (const r of [...t].reverse()) {
    const e = r.runtimeStatus ?? r.latestTurnStatus;
    if (e)
      return e;
  }
  return "unknown";
}
function Q(t) {
  return ["completed", "failed", "cancelled", "aborted", "closed"].includes(t);
}
function b(t) {
  return w(t, "preview") ?? w(t, "status") ?? t.runtimeStatus;
}
function w(t, r) {
  const e = t.payload?.[r];
  return typeof e == "string" && e.trim() ? e.trim() : void 0;
}
function Z(t, r) {
  if (!t)
    return r;
  if (!r)
    return t;
  if (r.startsWith(t))
    return r;
  const e = /[A-Za-z0-9`)]$/.test(t) && /^[A-Za-z0-9`(]/.test(r);
  return `${t}${e ? " " : ""}${r}`;
}
function I(t) {
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
function Ut(t) {
  return new Set(t.filter((r) => !!r)).size;
}
function Kt(t, r = {}) {
  const e = zt(t, r), n = J(t), i = K({
    ...e,
    events: n
  });
  return X(i);
}
function J(t) {
  const r = P(t) ? t : {};
  return [
    ...Y(r),
    ...tt(r, "root"),
    ...R(r, "runtimeFacts"),
    ...R(r, "task"),
    ...R(r, "snapshot")
  ];
}
function zt(t, r) {
  const e = P(t) ? t : {}, n = E(e, "task"), i = E(e, "snapshot");
  return {
    appId: o(e, "appId") ?? o(e, "app_id"),
    taskId: o(e, "taskId") ?? o(n, "taskId") ?? o(i, "taskId"),
    sessionId: o(e, "sessionId") ?? o(n, "sessionId") ?? o(i, "sessionId"),
    threadId: o(e, "threadId") ?? o(n, "threadId") ?? o(i, "threadId"),
    runId: o(e, "runtimeEventName") ?? o(e, "runId") ?? o(n, "runtimeEventName") ?? o(i, "runtimeEventName"),
    turnId: o(e, "turnId") ?? o(n, "turnId") ?? o(i, "turnId"),
    timestamp: o(e, "updatedAt") ?? o(e, "openedAt") ?? o(i, "updatedAt"),
    startSequence: r.startSequence
  };
}
function R(t, r) {
  const e = E(t, r);
  return e ? [
    ...Y(e),
    ...tt(e, r)
  ] : [];
}
function Y(t) {
  return [
    ...j(t, "events"),
    ...j(t, "taskEvents"),
    ...j(t, "agentUiEvents"),
    ...j(t, "projectionEvents")
  ];
}
function j(t, r) {
  const e = t[r];
  return Array.isArray(e) ? e : [];
}
function tt(t, r) {
  const e = E(t, "runtimeProcess") ?? E(t, "process");
  return e ? j(e, "timeline").map(
    (n, i) => Vt(n, i, r)
  ).filter((n) => !!n) : [];
}
function Vt(t, r, e) {
  if (!P(t))
    return null;
  const n = o(t, "kind") ?? "progress", i = o(t, "title"), s = o(t, "message") ?? i, u = o(t, "status") ?? o(t, "statusText") ?? o(t, "state"), l = o(t, "id") ?? o(t, "eventId") ?? `${e}:timeline:${r}`, p = {
    source: "runtimeProcess.timeline",
    timelineKind: n,
    title: i
  };
  if (n === "tool" || n === "skill") {
    const g = Ht(t, i, n);
    return !g && !s ? null : {
      id: l,
      eventType: "task:toolCall",
      status: u,
      message: s,
      toolName: g,
      toolCallId: o(t, "toolCallId") ?? o(t, "callId") ?? o(t, "toolId") ?? l,
      payload: p
    };
  }
  return n === "output" ? {
    id: l,
    eventType: "task:partialArtifact",
    status: u,
    message: s,
    payload: {
      ...p,
      streamKind: "assistant_text_delta",
      delta: s
    }
  } : n === "thinking" || n === "reasoning" ? {
    id: l,
    eventType: "task:partialArtifact",
    status: u,
    message: s,
    payload: {
      ...p,
      streamKind: "thinking_delta",
      delta: s
    }
  } : !s && !u ? null : {
    id: l,
    eventType: "task:status",
    status: u,
    message: s,
    payload: p
  };
}
function Ht(t, r, e) {
  const n = o(t, "toolName") ?? o(t, "tool_name") ?? o(t, "name") ?? o(t, "tool");
  if (n)
    return e === "skill" && !n.startsWith("Skill(") ? `Skill(${n})` : n;
  const s = r?.match(/^(?:工具|Tool|技能|Skill)\s*·\s*(.+)$/)?.[1]?.trim();
  if (s)
    return e === "skill" ? `Skill(${s})` : s;
}
function o(t, r) {
  const e = t?.[r];
  return typeof e == "string" && e.trim() ? e.trim() : null;
}
function E(t, r) {
  const e = t[r];
  return P(e) ? e : null;
}
function P(t) {
  return !!(t && typeof t == "object" && !Array.isArray(t));
}
function Ot(t = {}) {
  return K(t);
}
function Xt(t) {
  return X(t);
}
function et(t, r = {}) {
  return Kt(
    t,
    r
  );
}
function Gt(t) {
  return J(t);
}
const ne = Ot, ae = Xt, ie = et, se = Gt, Qt = `
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
`.trim(), C = {
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
    pendingActions: "Actions",
    tools: "Tools",
    artifacts: "Artifacts",
    evidence: "Evidence",
    queue: "Queue"
  },
  empty: "No AgentRuntime process yet."
};
function Zt(t, r = {}) {
  const { startSequence: e, ...n } = r;
  return rt(
    et(t, { startSequence: e }),
    n
  );
}
function rt(t, r = {}) {
  const e = Yt(r.labels), n = r.className ?? "lime-agent-run-projection", i = t.orderedParts.length > 0 ? t.orderedParts.map((u) => ee(u, e)).join("") : `<p data-lime-agent-run-projection-empty>${m(e.empty)}</p>`;
  return [
    r.includeStyles ? Jt(r.styleNonce) : "",
    `<section class="${A(n)}" data-lime-agent-run-projection data-terminal="${t.task.terminal ? "true" : "false"}">`,
    te(t, e),
    `<div data-lime-agent-run-projection-parts>${i}</div>`,
    re(t, e),
    $("artifacts", t.artifacts, e.summary.artifacts),
    $("evidence", t.evidence, e.summary.evidence),
    $("diagnostics", t.diagnostics, e.parts.diagnostic),
    "</section>"
  ].join("");
}
function Jt(t) {
  return `<style data-lime-agent-run-projection-style${t ? ` nonce="${A(t)}"` : ""}>${Qt}</style>`;
}
function Yt(t = {}) {
  return {
    parts: { ...C.parts, ...t.parts ?? {} },
    summary: { ...C.summary, ...t.summary ?? {} },
    empty: t.empty ?? C.empty
  };
}
function te(t, r) {
  return `<div data-lime-agent-run-projection-summary>${[
    [r.summary.status, t.task.latestRuntimeStatus],
    [r.summary.pendingActions, t.task.pendingActionCount],
    [r.summary.tools, t.task.toolCallCount],
    [r.summary.artifacts, t.task.artifactCount],
    [r.summary.evidence, t.task.evidenceCount],
    [r.summary.queue, t.task.queueCount]
  ].map(
    ([n, i]) => `<span data-lime-agent-run-projection-summary-item><strong>${m(String(n))}</strong><em>${m(String(i))}</em></span>`
  ).join("")}</div>`;
}
function ee(t, r) {
  const e = t.displayName ?? r.parts[t.label], n = t.collapsedByDefault ? "" : " open", i = t.runtimeStatus ? `<span data-lime-agent-run-projection-part-status>${m(t.runtimeStatus)}</span>` : "", s = t.preview ? `<div data-lime-agent-run-projection-part-preview>${m(t.preview)}</div>` : "";
  return [
    `<details data-lime-agent-run-projection-part data-kind="${A(t.kind)}" data-type="${A(t.type)}"${n}>`,
    `<summary><span>${m(e)}</span>${i}</summary>`,
    s,
    "</details>"
  ].join("");
}
function re(t, r) {
  return t.actions.length === 0 ? "" : `<div data-lime-agent-run-projection-actions>${t.actions.map(
    (e) => `<article data-lime-agent-run-projection-action data-status="${A(e.status)}"><strong>${m(r.parts[e.label])}</strong>${e.preview ? `<p>${m(e.preview)}</p>` : ""}</article>`
  ).join("")}</div>`;
}
function $(t, r, e) {
  return r.length === 0 ? "" : `<div data-lime-agent-run-projection-${A(t)}><strong>${m(e)}</strong>${r.map(
    (n) => `<article>${n.preview ? `<span>${m(n.preview)}</span>` : ""}${n.status ? `<em>${m(n.status)}</em>` : ""}</article>`
  ).join("")}</div>`;
}
function m(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function A(t) {
  return m(t);
}
function oe(t, r, e = {}) {
  const n = rt(r, e);
  return t.innerHTML = n, n;
}
function ce(t, r, e = {}) {
  const n = Zt(r, e);
  return t.innerHTML = n, n;
}
export {
  Qt as LIME_AGENT_RUN_PROJECTION_DEFAULT_CSS,
  ne as buildAgentAppAgentUiProjectionEvents,
  ae as buildAgentAppRunProjectionViewModel,
  ie as buildAgentRunProjectionViewModelFromState,
  Xt as buildLimeAgentRunProjectionViewModel,
  et as buildLimeAgentRunProjectionViewModelFromState,
  Ot as buildLimeAgentUiProjectionEvents,
  se as collectAgentRunProjectionSourceEvents,
  Gt as collectLimeAgentRunProjectionSourceEvents,
  oe as mountLimeAgentRunProjectionHtml,
  ce as mountLimeAgentRunProjectionState,
  rt as renderLimeAgentRunProjectionHtml,
  Zt as renderLimeAgentRunProjectionStateHtml,
  Jt as renderLimeAgentRunProjectionStyleTag
};
