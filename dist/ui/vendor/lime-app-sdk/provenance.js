function t(n) {
  const { preview: e } = n;
  return {
    sourceKind: "agent_app",
    appId: e.identity.appId,
    appVersion: e.identity.appVersion,
    packageHash: e.identity.packageHash,
    manifestHash: e.identity.manifestHash,
    entryKey: n.entryKey,
    workflowRunId: n.runId
  };
}
export {
  t as buildAgentAppProvenance
};
