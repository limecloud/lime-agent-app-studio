function n(e, t = {}) {
  return !(t.appId && e.appId !== t.appId || t.entryKey && e.entryKey !== t.entryKey || t.workflowRunId && e.workflowRunId !== t.workflowRunId);
}
export {
  n as matchesAgentAppProvenanceQuery
};
