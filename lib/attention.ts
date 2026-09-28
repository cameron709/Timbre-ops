export function attentionResolutionPatch(resolution: string, resolvedBy: string | null, resolvedAt = new Date()) {
  const trimmed = resolution.trim();
  if (!trimmed) throw new Error("A resolution or remaining follow-up is required.");

  return {
    resolved_at: resolvedAt.toISOString(),
    resolved_by: resolvedBy,
    resolution: trimmed
  };
}
