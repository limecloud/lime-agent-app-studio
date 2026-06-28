var f = Object.defineProperty;
var I = (i, e, t) => e in i ? f(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var r = (i, e, t) => I(i, typeof e != "symbol" ? e + "" : e, t);
import { AgentAppCapabilityError as c } from "./capabilityErrors.js";
import { buildRetryAgentAppTaskRecord as v, appendAgentAppTaskEvent as u, buildAgentAppTaskRecord as A } from "./agentTaskRuntime.js";
import { buildAgentAppProvenance as y } from "./provenance.js";
import { matchesAgentAppProvenanceQuery as l } from "./provenanceQuery.js";
function h(i, e) {
  return {
    kind: "ref",
    value: i,
    exists: !0,
    safeToDelete: !0,
    reason: e
  };
}
function g(i) {
  return {
    ...i,
    exists: !0
  };
}
function m(i) {
  return {
    ...i,
    exists: !0,
    safeToDelete: !1
  };
}
class $ {
  constructor(e) {
    r(this, "preview");
    r(this, "mockSdkEnabled");
    r(this, "now");
    r(this, "storageEntries", /* @__PURE__ */ new Map());
    r(this, "artifacts", []);
    r(this, "evidence", []);
    r(this, "tasks", []);
    r(this, "runCounter", 0);
    r(this, "taskCounter", 0);
    this.preview = e.preview, this.mockSdkEnabled = e.mockSdkEnabled ?? !0, this.now = e.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
  }
  createSdkContext(e, t) {
    this.assertMockSdkEnabled();
    const s = this.findEntry(e), a = y({
      preview: this.preview,
      entryKey: e,
      runId: t
    });
    return {
      appId: this.preview.identity.appId,
      entry: s,
      storage: this.createStorageCapability(a),
      artifacts: this.createArtifactsCapability(a),
      evidence: this.createEvidenceCapability(a),
      knowledge: this.createKnowledgeCapability(a),
      agent: this.createAgentCapability(a)
    };
  }
  async runEntry(e) {
    this.assertMockSdkEnabled();
    const t = this.findEntry(e);
    this.assertRunnable(t);
    const s = this.nextRunId(e), a = this.now(), n = y({
      preview: this.preview,
      entryKey: e,
      runId: s
    }), o = this.createSdkContext(e, s), d = {
      runId: s,
      appId: this.preview.identity.appId,
      entryKey: e,
      status: "running",
      startedAt: a,
      artifactIds: [],
      evidenceIds: [],
      storageKeys: [],
      taskIds: [],
      provenance: n
    }, w = await o.storage.set(`runs/${s}`, {
      entryKey: e,
      status: "running",
      title: t.title
    });
    d.storageKeys.push(w.key);
    const p = await o.artifacts.create({
      kind: "mock_agent_app_artifact",
      title: `${t.title} · mock artifact`,
      content: {
        appId: this.preview.identity.appId,
        entryKey: e,
        entryKind: t.kind,
        generatedBy: "MockCapabilityHost"
      }
    });
    d.artifactIds.push(p.id);
    const k = await o.evidence.record({
      kind: "mock_entry_run",
      message: `Mock entry ${t.key} generated artifact ${p.id}.`,
      refs: [p.id]
    });
    return d.evidenceIds.push(k.id), d.status = "succeeded", d.finishedAt = this.now(), await o.storage.set(`runs/${s}`, {
      entryKey: e,
      status: "succeeded",
      title: t.title,
      artifactIds: d.artifactIds,
      evidenceIds: d.evidenceIds
    }), {
      run: d,
      artifacts: [p],
      evidence: [k],
      tasks: [],
      knowledge: []
    };
  }
  getArtifacts(e) {
    return this.artifacts.filter(
      (t) => l(t.provenance, e)
    );
  }
  getEvidence(e) {
    return this.evidence.filter(
      (t) => l(t.provenance, e)
    );
  }
  getStorageEntries(e) {
    return Array.from(this.storageEntries.values()).filter(
      (t) => l(t.provenance, e)
    );
  }
  getTasks(e) {
    return this.tasks.filter(
      (t) => l(t.provenance, e)
    );
  }
  async uninstall(e) {
    const t = [
      ...e.cleanupPlan.packageCachePaths,
      ...e.cleanupPlan.packageCacheIndexPaths,
      ...e.cleanupPlan.packageStagingPaths,
      ...e.cleanupPlan.installedStatePaths,
      ...e.cleanupPlan.projectionPaths,
      ...e.cleanupPlan.readinessPaths,
      ...e.cleanupPlan.setupStatePaths,
      ...e.cleanupPlan.logPaths
    ].map(g), s = [
      ...e.cleanupPlan.overlayRefs,
      ...e.cleanupPlan.storageNamespaces,
      ...e.cleanupPlan.artifactRefs,
      ...this.artifacts.map(
        (a) => h(`artifact:${a.id}`, "Mock Agent App artifact.")
      ),
      ...e.cleanupPlan.evidenceRefs,
      ...this.evidence.map(
        (a) => h(`evidence:${a.id}`, "Mock Agent App evidence.")
      ),
      ...e.cleanupPlan.taskRefs,
      ...this.tasks.map(
        (a) => h(`task:${a.taskId}`, "Mock Agent App task.")
      ),
      ...e.cleanupPlan.secretRefs,
      ...e.cleanupPlan.exportPaths
    ];
    return e.deleteData && (this.storageEntries.clear(), this.artifacts.length = 0, this.evidence.length = 0, this.tasks.length = 0), {
      appId: this.preview.identity.appId,
      mode: e.deleteData ? "delete-data" : "keep-data",
      deletedTargets: [
        ...t,
        ...e.deleteData ? s.map(g) : []
      ],
      retainedTargets: e.deleteData ? [] : s.map(m),
      warnings: e.deleteData ? [] : [
        {
          code: "APP_DATA_RETAINED",
          message: "App storage, artifacts and evidence are retained."
        }
      ]
    };
  }
  createStorageCapability(e) {
    return this.assertCapabilityEnabled("lime.storage", e.entryKey), {
      namespace: this.preview.projection.storage?.namespace ?? this.preview.identity.appId,
      get: async (s) => this.storageEntries.get(s)?.value ?? null,
      set: async (s, a) => {
        const n = {
          appId: this.preview.identity.appId,
          key: s,
          value: a,
          updatedAt: this.now(),
          provenance: e
        };
        return this.storageEntries.set(s, n), n;
      },
      list: async () => Array.from(this.storageEntries.values()),
      delete: async (s) => this.storageEntries.delete(s)
    };
  }
  createArtifactsCapability(e) {
    return this.assertCapabilityEnabled("lime.artifacts", e.entryKey), {
      create: async (t) => {
        const s = {
          id: `mock-artifact-${this.artifacts.length + 1}`,
          appId: this.preview.identity.appId,
          entryKey: e.entryKey,
          kind: t.kind,
          title: t.title,
          content: t.content,
          createdAt: this.now(),
          provenance: e
        };
        return this.artifacts.push(s), s;
      },
      list: async () => [...this.artifacts]
    };
  }
  createEvidenceCapability(e) {
    return this.assertCapabilityEnabled("lime.evidence", e.entryKey), {
      record: async (t) => {
        const s = {
          id: `mock-evidence-${this.evidence.length + 1}`,
          appId: this.preview.identity.appId,
          entryKey: e.entryKey,
          runId: e.workflowRunId,
          kind: t.kind,
          message: t.message,
          createdAt: this.now(),
          refs: t.refs ?? [],
          provenance: e
        };
        return this.evidence.push(s), s;
      },
      list: async () => [...this.evidence]
    };
  }
  createKnowledgeCapability(e) {
    return this.assertCapabilityEnabled("lime.knowledge", e.entryKey), {
      search: async (t) => {
        const s = this.preview.projection.knowledgeBindings.slice(0, t.limit ?? 10).map((a) => ({
          id: `mock-knowledge:${this.preview.identity.appId}:${a.key}`,
          appId: this.preview.identity.appId,
          bindingKey: a.key,
          title: a.key,
          type: a.type,
          standard: a.standard,
          snippet: `Mock knowledge binding ${a.key}.`,
          provenance: e
        }));
        return {
          query: t.query,
          records: s,
          searchedAt: this.now(),
          provenance: e
        };
      }
    };
  }
  createAgentCapability(e) {
    return this.assertCapabilityEnabled("lime.agent", e.entryKey), {
      startTask: async (t) => {
        this.taskCounter += 1;
        const s = A({
          taskId: `mock-task-${this.taskCounter}`,
          traceId: `mock-trace-${this.taskCounter}`,
          appId: this.preview.identity.appId,
          entryKey: e.entryKey,
          request: t,
          provenance: e,
          now: this.now(),
          startMessage: "Mock task started."
        });
        return this.tasks.push(s), s;
      },
      streamTask: async (t) => {
        const s = this.tasks.find((a) => a.taskId === t);
        return s ? [...s.events] : [];
      },
      getTask: async (t) => this.tasks.find((s) => s.taskId === t) ?? null,
      cancelTask: async (t) => {
        const s = this.tasks.findIndex((o) => o.taskId === t);
        if (s < 0)
          throw new c({
            code: "TASK_NOT_FOUND",
            message: `Mock task ${t} was not found.`,
            appId: this.preview.identity.appId
          });
        const a = this.now(), n = {
          ...u(this.tasks[s], {
            type: "task:cancelled",
            status: "cancelled",
            at: a,
            message: "Mock task cancelled."
          }),
          status: "cancelled",
          cancelledAt: a,
          finishedAt: a
        };
        return this.tasks[s] = n, n;
      },
      retryTask: async (t) => {
        const s = this.tasks.find((n) => n.taskId === t);
        if (!s)
          throw new c({
            code: "TASK_NOT_FOUND",
            message: `Mock task ${t} was not found.`,
            appId: this.preview.identity.appId,
            capability: "lime.agent"
          });
        this.taskCounter += 1;
        const a = v({
          taskId: `mock-task-${this.taskCounter}`,
          traceId: `mock-trace-${this.taskCounter}`,
          sourceTask: s,
          provenance: e,
          now: this.now(),
          startMessage: "Mock task retried."
        });
        return this.tasks.push(a), a;
      },
      submitHostResponse: async (t) => this.submitHostResponse(t, e),
      listTasks: async () => [...this.tasks]
    };
  }
  submitHostResponse(e, t) {
    const s = this.tasks.findIndex((n) => n.taskId === e.taskId);
    if (s < 0)
      throw new c({
        code: "TASK_NOT_FOUND",
        message: `Mock task ${e.taskId} was not found.`,
        appId: this.preview.identity.appId,
        entryKey: t.entryKey,
        capability: "lime.agent"
      });
    const a = this.now();
    return this.tasks[s] = u(this.tasks[s], {
      type: "task:progress",
      status: this.tasks[s].status,
      at: a,
      message: "Mock host response 已提交。",
      payload: {
        requestId: e.requestId,
        actionType: e.actionType,
        confirmed: e.confirmed ?? !0
      }
    }), {
      taskId: e.taskId,
      requestId: e.requestId,
      status: "submitted",
      submittedAt: a
    };
  }
  assertMockSdkEnabled() {
    if (!this.mockSdkEnabled)
      throw new c({
        code: "FEATURE_DISABLED",
        message: "Agent App mock SDK is disabled.",
        appId: this.preview.identity.appId
      });
  }
  assertCapabilityEnabled(e, t) {
    if (!this.preview.readiness.supportedCapabilities.find(
      (a) => a.capability === e
    )?.enabled)
      throw new c({
        code: "CAPABILITY_NOT_DECLARED",
        message: `${e} is not enabled for this Agent App preview.`,
        appId: this.preview.identity.appId,
        entryKey: t,
        capability: e
      });
  }
  assertRunnable(e) {
    const t = this.preview.readiness.entryReadiness.find(
      (s) => s.entryKey === e.key
    );
    if (!(this.preview.readiness.blockers.length === 0 && t?.status !== "blocked"))
      throw new c({
        code: "READINESS_BLOCKED",
        message: `Entry ${e.key} is blocked by readiness checks.`,
        appId: this.preview.identity.appId,
        entryKey: e.key
      });
  }
  findEntry(e) {
    const t = this.preview.projection.entries.find(
      (s) => s.key === e
    );
    if (t)
      return t;
    throw new c({
      code: "ENTRY_NOT_FOUND",
      message: `Agent App entry ${e} was not found.`,
      appId: this.preview.identity.appId,
      entryKey: e
    });
  }
  nextRunId(e) {
    return this.runCounter += 1, `${this.preview.identity.appId}-${e}-mock-run-${this.runCounter}`;
  }
}
export {
  $ as MockCapabilityHost
};
