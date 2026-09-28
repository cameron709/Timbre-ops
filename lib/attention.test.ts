import { describe, expect, it } from "vitest";
import { attentionResolutionPatch } from "./attention";

describe("attentionResolutionPatch", () => {
  it("records resolution metadata on the existing history row", () => {
    expect(attentionResolutionPatch("  Awaiting revised access map  ", "user-1", new Date("2026-09-28T12:00:00Z"))).toEqual({
      resolved_at: "2026-09-28T12:00:00.000Z",
      resolved_by: "user-1",
      resolution: "Awaiting revised access map"
    });
  });

  it("rejects a review with no recorded outcome", () => {
    expect(() => attentionResolutionPatch("  ", null)).toThrow("required");
  });
});
