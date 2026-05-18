function o(e, n) {
  const t = e?.trim();
  return t || n;
}
function m(e) {
  return (e ?? []).map((n) => n.trim()).filter(Boolean);
}
function u({
  taskId: e,
  traceId: n,
  appId: t,
  entryKey: p,
  retryOfTaskId: d,
  retryAttempt: l,
  request: i,
  provenance: f,
  now: y,
  startMessage: c
}) {
  const g = o(i.title, "Agent App task"), a = o(i.prompt, g), v = {
    eventId: `${e}:event-1`,
    taskId: e,
    traceId: n,
    type: "task:status",
    status: "running",
    at: y,
    message: c
  }, s = {
    taskId: e,
    traceId: n,
    appId: t,
    entryKey: p,
    title: g,
    prompt: a,
    taskKind: o(i.taskKind, "agent_task"),
    idempotencyKey: o(
      i.idempotencyKey,
      `${p ?? t}:${g}`
    ),
    input: i.input ?? { prompt: a },
    expectedOutput: i.expectedOutput,
    knowledge: [...i.knowledge ?? []],
    tools: m(i.tools),
    files: m(i.files),
    secrets: m(i.secrets),
    humanReview: i.humanReview ?? !1,
    status: "running",
    startedAt: y,
    trace: [
      {
        at: y,
        message: c
      }
    ],
    events: [v],
    provenance: f
  };
  return d && (s.retryOfTaskId = d), l !== void 0 && (s.retryAttempt = l), s;
}
function r({
  taskId: e,
  traceId: n,
  sourceTask: t,
  provenance: p,
  now: d,
  startMessage: l
}) {
  const i = (t.retryAttempt ?? 0) + 1;
  return u({
    taskId: e,
    traceId: n,
    appId: t.appId,
    entryKey: t.entryKey,
    retryOfTaskId: t.taskId,
    retryAttempt: i,
    request: {
      title: t.title,
      prompt: t.prompt,
      taskKind: t.taskKind,
      idempotencyKey: `${t.idempotencyKey}:retry:${i}`,
      input: t.input,
      expectedOutput: t.expectedOutput,
      knowledge: [...t.knowledge],
      tools: [...t.tools],
      files: [...t.files],
      secrets: [...t.secrets],
      humanReview: t.humanReview
    },
    provenance: p,
    now: d,
    startMessage: l
  });
}
function A(e, n) {
  const t = {
    eventId: `${e.taskId}:event-${e.events.length + 1}`,
    taskId: e.taskId,
    traceId: e.traceId,
    type: n.type,
    status: n.status,
    at: n.at,
    message: n.message,
    payload: n.payload,
    refs: n.refs
  };
  return {
    ...e,
    status: n.status ?? e.status,
    trace: n.message ? [
      ...e.trace,
      {
        at: n.at,
        message: n.message
      }
    ] : e.trace,
    events: [...e.events, t]
  };
}
export {
  A as appendAgentAppTaskEvent,
  u as buildAgentAppTaskRecord,
  r as buildRetryAgentAppTaskRecord
};
