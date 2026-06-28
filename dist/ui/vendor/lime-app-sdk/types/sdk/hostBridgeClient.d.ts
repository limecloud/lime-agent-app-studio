import { type LimeCapabilityInvoker, type LimeCapabilityInvokeResponse, type LimeCapabilityName } from "./capabilityContract";
export declare const LIME_AGENT_APP_BRIDGE_PROTOCOL = "lime.agentApp.bridge";
export declare const LIME_AGENT_APP_BRIDGE_VERSION = 1;
export interface LimeAgentAppBridgeClientMessage {
    protocol: typeof LIME_AGENT_APP_BRIDGE_PROTOCOL;
    version: typeof LIME_AGENT_APP_BRIDGE_VERSION;
    type: string;
    requestId?: string;
    appId: string;
    entryKey?: string;
    payload?: unknown;
}
interface LimeHostBridgeMessageEvent {
    data: unknown;
    origin: string;
    source: unknown;
}
interface LimeHostBridgeWindowLike {
    readonly parent: {
        postMessage(message: LimeAgentAppBridgeClientMessage, targetOrigin: string): void;
    };
    readonly self?: unknown;
    addEventListener(type: "message", listener: (event: LimeHostBridgeMessageEvent) => void): void;
    removeEventListener(type: "message", listener: (event: LimeHostBridgeMessageEvent) => void): void;
    setTimeout(handler: () => void, timeoutMs: number): number;
    clearTimeout(timerId: number): void;
}
export interface CreateLimeHostBridgeCapabilityInvokerOptions {
    appId: string;
    entryKey?: string;
    windowRef?: LimeHostBridgeWindowLike;
    targetOrigin?: string;
    trustedHostOrigin?: string;
    requestTimeoutMs?: number;
    requestIdPrefix?: string;
}
export interface LimeHostBridgeCapabilityInvoker extends LimeCapabilityInvoker {
    sendReady(): void;
    getHostSnapshot(): Promise<LimeCapabilityInvokeResponse<unknown>>;
    notifyHost(payload: LimeHostBridgeNotifyPayload): Promise<LimeCapabilityInvokeResponse<{
        accepted: true;
    }>>;
    navigateHost(payload: LimeHostBridgeNavigatePayload): Promise<LimeCapabilityInvokeResponse<{
        navigatedTo: string;
    }>>;
    openExternalHost(payload: LimeHostBridgeOpenExternalPayload): Promise<LimeCapabilityInvokeResponse<{
        opened: true;
    }>>;
    downloadHost(payload: LimeHostBridgeDownloadPayload): Promise<LimeCapabilityInvokeResponse<{
        downloaded: true;
    }>>;
    onHostSnapshot(handler: LimeHostBridgeEventHandler): () => void;
    onThemeUpdate(handler: LimeHostBridgeEventHandler): () => void;
    onVisibilityChange(handler: LimeHostBridgeEventHandler): () => void;
    subscribeCapability(request: LimeHostBridgeCapabilitySubscribeRequest, handler: LimeHostBridgeCapabilityEventHandler): Promise<LimeCapabilityInvokeResponse<LimeHostBridgeCapabilitySubscription>>;
    unsubscribeCapability(subscriptionId: string): Promise<LimeCapabilityInvokeResponse<LimeHostBridgeCapabilityUnsubscribeResult>>;
    dispose(): void;
    readonly pendingRequestCount: number;
}
export interface LimeHostBridgeNotifyPayload {
    message: string;
    level?: "info" | "success" | "warning" | "error";
}
export interface LimeHostBridgeDownloadPayload {
    url: string;
    fileName?: string;
}
export interface LimeHostBridgeNavigatePayload {
    route?: string;
    url?: string;
}
export interface LimeHostBridgeOpenExternalPayload {
    url: string;
}
export type LimeHostBridgeEventHandler = (payload: unknown) => void;
export interface LimeHostBridgeCapabilitySubscribeRequest {
    capability: LimeCapabilityName;
    topic: string;
    input?: unknown;
    subscriptionId?: string;
    pollIntervalMs?: number;
    bridgeAction?: string;
}
export interface LimeHostBridgeCapabilitySubscription {
    subscriptionId: string;
    capability: LimeCapabilityName;
    topic: string;
    taskId?: string;
    pollIntervalMs?: number;
    bridgeAction?: string;
}
export interface LimeHostBridgeCapabilityUnsubscribeResult {
    subscriptionId: string;
    unsubscribed: boolean;
}
export interface LimeHostBridgeCapabilityEvent {
    subscriptionId?: string;
    capability?: string;
    topic?: string;
    eventType?: string;
    taskId?: string;
    task?: unknown;
    events?: unknown[];
    snapshot?: unknown;
    error?: unknown;
    emittedAt?: string;
}
export type LimeHostBridgeCapabilityEventHandler = (event: LimeHostBridgeCapabilityEvent) => void;
export declare function createLimeHostBridgeCapabilityInvoker(options: CreateLimeHostBridgeCapabilityInvokerOptions): LimeHostBridgeCapabilityInvoker;
export {};
