import { describe, expect, it } from "vitest";
import { extractAttachmentText } from "./attachment-text";

describe("attachment text extraction", () => {
  it("extracts plain-text attachments", async () => {
    await expect(extractAttachmentText(Buffer.from("Bump-in 8:30am"), "text/plain", "run-sheet.txt")).resolves.toBe("Bump-in 8:30am");
  });

  it("ignores unsupported binary attachments", async () => {
    await expect(extractAttachmentText(Buffer.from([1, 2, 3]), "image/png", "site.png")).resolves.toBe("");
  });
});
