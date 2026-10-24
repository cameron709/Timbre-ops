import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractAttachmentText } from "./attachment-text";

describe("attachment text extraction", () => {
  it("extracts plain-text attachments", async () => {
    await expect(extractAttachmentText(Buffer.from("Bump-in 8:30am"), "text/plain", "run-sheet.txt")).resolves.toBe("Bump-in 8:30am");
  });

  it("extracts rows from XLSX programme attachments", async () => {
    const zip=new JSZip();
    zip.file("xl/sharedStrings.xml",`<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>FRIDAY</t></si><si><t>10.00am</t></si><si><t>Paul Costa</t></si><si><t>NO break</t></si></sst>`);
    zip.file("xl/worksheets/sheet1.xml",`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row></sheetData></worksheet>`);
    const bytes=await zip.generateAsync({type:"nodebuffer"});
    const text=await extractAttachmentText(bytes,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Programme.xlsx");
    expect(text).toContain("FRIDAY\t10.00am\tPaul Costa\tNO break");
  });

  it("ignores unsupported binary attachments", async () => {
    await expect(extractAttachmentText(Buffer.from([1, 2, 3]), "image/png", "site.png")).resolves.toBe("");
  });
});
