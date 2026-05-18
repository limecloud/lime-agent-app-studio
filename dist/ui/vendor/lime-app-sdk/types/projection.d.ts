export type LimeAgentUiOwner = "runtime" | "model" | "tool" | "action" | "artifact" | "evidence" | "context" | "policy" | "task" | "session" | "diagnostics" | "ui_projection" | "unknown" | "agent" | "team";
export type LimeAgentUiScope = "application" | "workspace" | "session" | "thread" | "run" | "turn" | "message" | "part" | "task" | "agent" | "tool_call" | "action_request" | "artifact" | "evidence" | "unknown" | "team";
export type LimeAgentUiPhase = "draft" | "submitted" | "accepted" | "routing" | "preparing" | "planning" | "reasoning" | "acting" | "waiting" | "producing" | "reconciling" | "completed" | "failed" | "cancelled" | "interrupted" | "archived" | "hydrating" | "unknown" | "reviewing";
export type LimeAgentUiSurface = "composer" | "conversation" | "inline_process" | "runtime_status" | "tool_ui" | "hitl" | "task_capsule" | "artifact_workspace" | "timeline_evidence" | "session_tabs" | "diagnostics" | "custom" | "unknown" | "team_roster" | "work_board" | "delegation_graph" | "handoff_lane" | "worker_notifications" | "review_lane" | "teammate_transcript" | "background_teammate" | "remote_teammate" | "team_policy";
export type LimeAgentUiPersistence = "ephemeral_live" | "transcript" | "snapshot" | "archive" | "artifact_store" | "evidence_pack" | "diagnostics_log" | "ui_local" | "unknown";
export type LimeAgentUiControl = "send" | "queue" | "steer" | "interrupt" | "approve" | "reject" | "answer" | "edit" | "retry" | "rollback" | "remove" | "export" | "open_detail" | "none" | "unknown" | "delegate" | "assign" | "continue_agent" | "wait" | "stop" | "close" | "request_review";
export type LimeAgentUiEventClass = "session.opened" | "session.hydrated" | "session.updated" | "session.closed" | "run.started" | "run.status" | "run.finished" | "run.failed" | "plan.delta" | "plan.final" | "text.delta" | "text.final" | "reasoning.delta" | "reasoning.summary" | "tool.started" | "tool.args" | "tool.args.delta" | "tool.progress" | "tool.output.delta" | "tool.result" | "tool.failed" | "action.required" | "action.resolved" | "queue.changed" | "task.changed" | "agent.changed" | "context.changed" | "context.compaction.started" | "context.compaction.completed" | "permission.changed" | "artifact.created" | "artifact.updated" | "artifact.preview.ready" | "artifact.version.created" | "artifact.diff.ready" | "artifact.export.started" | "artifact.export.completed" | "artifact.failed" | "artifact.deleted" | "artifact.changed" | "evidence.changed" | "state.snapshot" | "state.delta" | "messages.snapshot" | "diagnostic.changed" | "metric.changed" | "agent.spawned" | "agent.completed" | "agent.handoff" | "team.changed" | "worker.notification" | "review.requested" | "review.completed";
export type LimeAgentUiRuntimeStatus = "idle" | "queued" | "submitted" | "accepted" | "preparing" | "running" | "waiting" | "needs_input" | "plan_ready" | "completed" | "failed" | "aborted" | "cancelled" | "closed" | "not_found" | "unknown";
export interface LimeAgentUiProjectionRefs {
    artifactIds?: string[];
    artifactPaths?: string[];
    contextSourceIds?: string[];
    teamMemoryKeys?: string[];
    diagnosticKeys?: string[];
    rawEventRef?: string;
}
export interface LimeAgentUiProjectionEvent {
    type: LimeAgentUiEventClass;
    sourceType: string;
    sequence?: number;
    timestamp?: string;
    sessionId?: string;
    threadId?: string;
    runId?: string;
    turnId?: string;
    messageId?: string;
    partId?: string;
    taskId?: string;
    toolCallId?: string;
    actionId?: string;
    artifactId?: string;
    evidenceId?: string;
    agentId?: string;
    diagnosticId?: string;
    owner: LimeAgentUiOwner;
    scope: LimeAgentUiScope;
    phase: LimeAgentUiPhase;
    surface?: LimeAgentUiSurface;
    persistence?: LimeAgentUiPersistence;
    control?: LimeAgentUiControl;
    parentSessionId?: string;
    parentThreadId?: string;
    agentName?: string;
    teamName?: string;
    teamId?: string;
    agentRole?: string;
    agentSource?: string;
    workerNotificationId?: string;
    remoteTaskId?: string;
    transcriptRef?: string;
    topology?: string;
    runtimeEntity?: string;
    runtimeStatus?: LimeAgentUiRuntimeStatus;
    latestTurnStatus?: LimeAgentUiRuntimeStatus;
    teamPhase?: string;
    teamParallelBudget?: number;
    teamActiveCount?: number;
    teamQueuedCount?: number;
    queuedTurnCount?: number;
    queueReason?: string;
    providerConcurrencyGroup?: string;
    providerParallelBudget?: number;
    retryableOverload?: boolean;
    workItemId?: string;
    reviewId?: string;
    handoffId?: string;
    workerUsage?: Record<string, unknown> | null;
    teamPolicy?: Record<string, unknown> | null;
    payload?: Record<string, unknown>;
    refs?: LimeAgentUiProjectionRefs;
    rawEventRef?: string;
}
export interface LimeAgentUiProjectionBuildOptions {
    appId?: string | null;
    taskId?: string | null;
    sessionId?: string | null;
    threadId?: string | null;
    runId?: string | null;
    turnId?: string | null;
    timestamp?: string | null;
    startSequence?: number;
    events?: unknown[];
}
export interface LimeAgentRunProjectionStateOptions {
    startSequence?: number;
}
export type LimeAgentRunProjectionPartKind = "status" | "queue" | "text" | "reasoning" | "tool" | "action" | "artifact" | "evidence" | "diagnostic";
export type LimeAgentRunProjectionLabel = "status" | "queue" | "answer" | "reasoning" | "tool" | "actionRequired" | "actionResolved" | "artifact" | "evidence" | "diagnostic";
export type LimeAgentRunProjectionActionControl = Exclude<LimeAgentUiControl, "none">;
export interface LimeAgentRunProjectionPart {
    id: string;
    kind: LimeAgentRunProjectionPartKind;
    type: LimeAgentUiEventClass;
    sequence: number;
    label: LimeAgentRunProjectionLabel;
    displayName?: string;
    preview?: string;
    runtimeStatus?: LimeAgentUiRuntimeStatus;
    surface?: LimeAgentUiSurface;
    collapsedByDefault: boolean;
    toolCallId?: string;
    actionId?: string;
    artifactId?: string;
    evidenceId?: string;
}
export interface LimeAgentRunProjectionAction {
    actionId: string;
    sessionId?: string;
    threadId?: string;
    runId?: string;
    turnId?: string;
    taskId?: string;
    actionType?: string;
    status: "pending" | "resolved";
    label: "actionRequired" | "actionResolved";
    control?: LimeAgentRunProjectionActionControl;
    controls: LimeAgentRunProjectionActionControl[];
    preview?: string;
}
export interface LimeAgentRunProjectionArtifact {
    artifactId: string;
    label: "artifact";
    preview?: string;
    ref?: string;
    status?: LimeAgentUiRuntimeStatus;
}
export interface LimeAgentRunProjectionEvidence {
    evidenceId: string;
    label: "evidence";
    preview?: string;
    status?: LimeAgentUiRuntimeStatus;
}
export interface LimeAgentRunProjectionDiagnostic {
    diagnosticId: string;
    label: "diagnostic";
    preview?: string;
    status?: LimeAgentUiRuntimeStatus;
}
export interface LimeAgentRunProjectionTaskSummary {
    latestRuntimeStatus: LimeAgentUiRuntimeStatus | "unknown";
    terminal: boolean;
    collapsedByDefault: boolean;
    pendingActionCount: number;
    toolCallCount: number;
    artifactCount: number;
    evidenceCount: number;
    queueCount: number;
}
export interface LimeAgentRunProjectionViewModel {
    orderedParts: LimeAgentRunProjectionPart[];
    actions: LimeAgentRunProjectionAction[];
    artifacts: LimeAgentRunProjectionArtifact[];
    evidence: LimeAgentRunProjectionEvidence[];
    diagnostics: LimeAgentRunProjectionDiagnostic[];
    task: LimeAgentRunProjectionTaskSummary;
    answerText: string;
    reasoningText: string;
}
export declare function buildLimeAgentUiProjectionEvents(options?: LimeAgentUiProjectionBuildOptions): LimeAgentUiProjectionEvent[];
export declare function buildLimeAgentRunProjectionViewModel(events: LimeAgentUiProjectionEvent[]): LimeAgentRunProjectionViewModel;
export declare function buildLimeAgentRunProjectionViewModelFromState(state: unknown, options?: LimeAgentRunProjectionStateOptions): LimeAgentRunProjectionViewModel;
export declare function collectLimeAgentRunProjectionSourceEvents(state: unknown): unknown[];
export declare const buildAgentAppAgentUiProjectionEvents: typeof buildLimeAgentUiProjectionEvents;
export declare const buildAgentAppRunProjectionViewModel: typeof buildLimeAgentRunProjectionViewModel;
export declare const buildAgentRunProjectionViewModelFromState: typeof buildLimeAgentRunProjectionViewModelFromState;
export declare const collectAgentRunProjectionSourceEvents: typeof collectLimeAgentRunProjectionSourceEvents;
export interface LimeAgentRunProjectionSummaryLabels {
    status: string;
    pendingActions: string;
    tools: string;
    artifacts: string;
    evidence: string;
    queue: string;
}
export interface LimeAgentRunProjectionRenderLabels {
    parts?: Partial<Record<LimeAgentRunProjectionLabel, string>>;
    summary?: Partial<LimeAgentRunProjectionSummaryLabels>;
    empty?: string;
}
export interface LimeAgentRunProjectionRenderOptions {
    labels?: LimeAgentRunProjectionRenderLabels;
    className?: string;
    includeStyles?: boolean;
    styleNonce?: string;
}
export interface LimeAgentRunProjectionStateRenderOptions extends LimeAgentRunProjectionRenderOptions {
    startSequence?: number;
}
export declare const LIME_AGENT_RUN_PROJECTION_DEFAULT_CSS: string;
export declare function renderLimeAgentRunProjectionStateHtml(state: unknown, options?: LimeAgentRunProjectionStateRenderOptions): string;
export declare function renderLimeAgentRunProjectionHtml(view: LimeAgentRunProjectionViewModel, options?: LimeAgentRunProjectionRenderOptions): string;
export declare function renderLimeAgentRunProjectionStyleTag(nonce?: string): string;
export interface LimeAgentRunProjectionMountTarget {
    innerHTML: string;
}
export declare function mountLimeAgentRunProjectionHtml(target: LimeAgentRunProjectionMountTarget, view: LimeAgentRunProjectionViewModel, options?: LimeAgentRunProjectionRenderOptions): string;
export declare function mountLimeAgentRunProjectionState(target: LimeAgentRunProjectionMountTarget, state: unknown, options?: LimeAgentRunProjectionStateRenderOptions): string;
