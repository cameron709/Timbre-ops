import { describe,expect,it } from "vitest";
import { buildGmailSearch,normalizeGmailThread,proposalsForNormalizedThread,type GmailThread } from "./gmail-import";

const b64=(value:string)=>Buffer.from(value).toString("base64url");
const message=(id:string,date:string,body:string):GmailThread["messages"][number]=>({id,threadId:"t1",internalDate:String(new Date(date).getTime()),snippet:"Wine Show WA quote",payload:{headers:[{name:"From",value:"Kahlia Ericson <info@wineshowwa.com.au>"},{name:"To",value:"cameron@timbrepa.com.au"},{name:"Subject",value:"Wine Show WA quote"}],parts:[{mimeType:"text/plain",body:{data:b64(body)}}]}  it("builds a broad but date-bounded query for shorthand event titles",()=>{const query=buildGmailSearch({title:"Mt Trio Muster",startDate:"2026-10-29"});expect(query).toContain('"Mt Trio Muster"');expect(query).toContain("trio");expect(query).toContain("muster");expect(query).toContain("after:");expect(query).toContain("before:");});
});

describe("gmail proposal staging",()=>{
  it("does not stage year-old messages from a revived thread",()=>{const thread:GmailThread={id:"t1",messages:[message("old","2025-10-04T00:00:00Z","Event date: 17 October 2025"),message("new","2026-09-15T00:00:00Z","Event date: 16 October 2026")]};const normal=normalizeGmailThread(thread,{title:"Wine Show WA",startDate:"2026-10-16",clientName:"Wine Show WA",contactEmails:["info@wineshowwa.com.au"]});const proposals=proposalsForNormalizedThread(normal).filter(item=>item.fieldKey==="start_date");expect(proposals).toHaveLength(1);expect(proposals[0].value).toEqual({date:"2026-10-16"});});
});
