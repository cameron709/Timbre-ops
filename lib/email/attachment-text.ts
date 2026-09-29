import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export async function extractAttachmentText(bytes: Buffer, mimeType: string | null, filename: string) {
  if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error(`${filename} is larger than the 10 MB extraction limit.`);
  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      return (await parser.getText()).text.trim();
    } finally {
      await parser.destroy();
    }
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filename.toLowerCase().endsWith(".docx")) {
    return (await mammoth.extractRawText({ buffer: bytes })).value.trim();
  }
  if (mimeType?.startsWith("text/") || filename.toLowerCase().endsWith(".txt")) return bytes.toString("utf8").trim();
  return "";
}
