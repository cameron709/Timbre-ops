import { describe, expect, it } from "vitest";
import { parseAssistantCommand } from "@/lib/assistant/parser";

describe("parseAssistantCommand", () => {
  it("parses the DI pack list command", () => {
    expect(parseAssistantCommand("Add another DI to Mad Hatters")).toEqual({
      type: "add_pack_item_quantity",
      raw: "Add another DI to Mad Hatters",
      jobHint: "Mad Hatters",
      itemHint: "DI",
      quantity: 1
    });
  });

  it("parses Beth operation ownership and due day", () => {
    const monday = new Date("2026-09-28T04:00:00.000Z");
    const intent = parseAssistantCommand("Beth needs to order a marquee by Wednesday", monday);

    expect(intent.type).toBe("upsert_operation");
    if (intent.type === "upsert_operation") {
      expect(intent.owner).toBe("Beth");
      expect(intent.title).toBe("Order marquee");
      expect(intent.dueAt).toBe("2026-09-30T01:00:00.000Z");
    }
  });

  it("parses a reusable job memory", () => {
    expect(parseAssistantCommand("Remember use longer XLR runs for Mad Hatters")).toEqual({
      type: "remember",
      raw: "Remember use longer XLR runs for Mad Hatters",
      summary: "use longer XLR runs",
      jobHint: "Mad Hatters"
    });
  });

  it("parses site access information when a job is explicit", () => {
    expect(parseAssistantCommand("Jamie said we can get onto site at 8:30am for Mad Hatters")).toEqual({
      type: "inform_arrival",
      raw: "Jamie said we can get onto site at 8:30am for Mad Hatters",
      timeText: "8:30am",
      jobHint: "Mad Hatters"
    });
  });

  it("parses a find request without granting arbitrary actions", () => {
    expect(parseAssistantCommand("Find presentation laptop lessons")).toEqual({
      type: "find",
      raw: "Find presentation laptop lessons",
      query: "presentation laptop lessons"
    });
  });
});
