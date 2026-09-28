import { describe, expect, it } from "vitest";
import { formatDateOnly, formatTemporal } from "@/lib/format";

describe("temporal formatting", () => {
  it("renders date-only values without a fabricated time", () => {
    const result = formatTemporal({ precision: "date", date: "2026-09-29", dateTime: "2026-09-29T01:00:00Z" });
    expect(result).toBe("Tue, 29 Sept 2026");
    expect(result).not.toMatch(/am|pm|12:00|9:00/i);
  });

  it("renders timed values with their real time", () => {
    expect(formatTemporal({ precision: "timed", date: null, dateTime: "2026-09-29T01:30:00Z" })).toContain("9:30 am");
  });

  it("formats ISO dates without timezone drift", () => {
    expect(formatDateOnly("2026-10-01")).toContain("1 Oct");
  });
});
