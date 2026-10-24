import JSZip from "jszip";
import mammoth from "mammoth";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const decodeXml=(value:string)=>value
  .replace(/&lt;/g,"<")
  .replace(/&gt;/g,">")
  .replace(/&quot;/g,'"')
  .replace(/&apos;/g,"'")
  .replace(/&amp;/g,"&");

const textNodes=(xml:string)=>[...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
  .map(match=>decodeXml(match[1]))
  .join("");

const columnIndex=(ref:string)=>{
  const letters=ref.match(/[A-Z]+/i)?.[0]?.toUpperCase()??"";
  let index=0;
  for(const char of letters) index=index*26+(char.charCodeAt(0)-64);
  return Math.max(0,index-1);
};

async function extractXlsxText(bytes:Buffer){
  const zip=await JSZip.loadAsync(bytes);
  const sharedXml=await zip.file("xl/sharedStrings.xml")?.async("string");
  const shared=sharedXml?[...sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(match=>textNodes(match[1])):[];

  const sheetPaths=Object.keys(zip.files)
    .filter(path=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((a,b)=>{
      const an=Number(a.match(/sheet(\d+)/i)?.[1]??0);
      const bn=Number(b.match(/sheet(\d+)/i)?.[1]??0);
      return an-bn;
    });

  const sections:string[]=[];
  for(let i=0;i<sheetPaths.length;i++){
    const xml=await zip.file(sheetPaths[i])?.async("string");
    if(!xml) continue;
    const lines:string[]=[];
    for(const rowMatch of xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)){
      const cells:string[]=[];
      let sequentialIndex=0;
      for(const cellMatch of rowMatch[1].matchAll(/<c(?:\s([^>]*))?>([\s\S]*?)<\/c>/g)){
        const attrs=cellMatch[1]??"";
        const body=cellMatch[2];
        const ref=attrs.match(/\br="([^"]+)"/)?.[1];
        const type=attrs.match(/\bt="([^"]+)"/)?.[1];
        const index=ref?columnIndex(ref):sequentialIndex;
        sequentialIndex=index+1;
        let value="";
        if(type==="s"){
          const sharedIndex=Number(body.match(/<v>([\s\S]*?)<\/v>/)?.[1]);
          value=Number.isInteger(sharedIndex)?shared[sharedIndex]??"":"";
        }else if(type==="inlineStr"){
          value=textNodes(body);
        }else{
          value=decodeXml(body.match(/<v>([\s\S]*?)<\/v>/)?.[1]??textNodes(body));
        }
        cells[index]=value.trim();
      }
      let last=cells.length-1;
      while(last>=0&&!cells[last]) last--;
      if(last>=0) lines.push(cells.slice(0,last+1).map(value=>value??"").join("\t"));
    }
    if(lines.length) sections.push(`[Sheet ${i+1}]\n${lines.join("\n")}`);
  }
  return sections.join("\n\n").trim();
}

export async function extractAttachmentText(bytes: Buffer, mimeType: string | null, filename: string) {
  if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error(`${filename} is larger than the 10 MB extraction limit.`);
  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
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
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || filename.toLowerCase().endsWith(".xlsx")) {
    return extractXlsxText(bytes);
  }
  if (mimeType?.startsWith("text/") || filename.toLowerCase().endsWith(".txt")) return bytes.toString("utf8").trim();
  return "";
}
