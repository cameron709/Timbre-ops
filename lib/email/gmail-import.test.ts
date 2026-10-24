import { describe,expect,it } from "vitest";
import { buildGmailSearch,normalizeGmailThread,proposalsForNormalizedThread,type GmailThread } from "./gmail-import";

const b64=(value:string)=>Buffer.from(value).toString("base64url");
const message=(id:string,date:string,body:string):GmailThread["messages"][number]=>({
  id,
  threadId:"t1",
  internalDate:String(new Date(date).getTime()),
  snippet:"Wine Show WA quote",
  payload:{
    headers:[
      {name:"From",value:"Kahlia Ericson <info@wineshowwa.com.au>"},
      {name:"To",value:"cameron@timbrepa.com.au"},
      {name:"Subject",value:"Wine Show WA quote"}
    ],
    parts:[{mimeType:"text/plain",body:{data:b64(body)}}]
  }
});

describe("gmail proposal staging",()=>{
  it("does not stage year-old messages from a revived thread",()=>{
    const thread:GmailThread={id:"t1",messages:[
      message("old","2025-10-04T00:00:00Z","Event date: 17 October 2025"),
      message("new","2026-09-15T00:00:00Z","Event date: 16 October 2026")
    ]};
    const normal=normalizeGmailThread(thread,{title:"Wine Show WA",startDate:"2026-10-16",clientName:"Wine Show WA",contactEmails:["info@wineshowwa.com.au"]});
    const proposals=proposalsForNormalizedThread(normal).filter(item=>item.fieldKey==="start_date");
    expect(proposals).toHaveLength(1);
    expect(proposals[0].value).toEqual({date:"2026-10-16"});
  });

  it("builds a broad but date-bounded query for shorthand event titles",()=>{
    const query=buildGmailSearch({title:"Mt Trio Muster",startDate:"2026-10-29"});
    expect(query).toContain('"Mt Trio Muster"');
    expect(query).toContain("trio");
    expect(query).toContain("muster");
    expect(query).toContain("after:");
    expect(query).toContain("before:");
  });
});


it("does not promote unrelated thread participants as the job contact",()=>{
  const thread:GmailThread={id:"t2",messages:[{
    id:"artist",
    threadId:"t2",
    internalDate:String(new Date("2026-10-14T10:37:36Z").getTime()),
    snippet:"Jason contact correction",
    payload:{
      headers:[
        {name:"From",value:"DonnaLou Matthews <dljkmusic@gmail.com>"},
        {name:"To",value:"mt.trio13@gmail.com"},
        {name:"Subject",value:"Re: AFGRI Mountain Country Music Muster"}
      ],
      parts:[{mimeType:"text/plain",body:{data:b64("Jason's correct number is 0409 822 740.")}}]
    }
  }]};
  const normal=normalizeGmailThread(thread,{title:"Mt Trio Muster",startDate:"2026-10-29",clientName:"Mt Trio Bush Camp & Caravan Park",contactEmails:["mt.trio13@gmail.com"]});
  const proposals=proposalsForNormalizedThread(normal);
  expect(proposals.some(item=>item.fieldKey==="contact")).toBe(false);
});

it("still promotes the known organiser as the primary contact",()=>{
  const thread:GmailThread={id:"t3",messages:[{
    id:"organiser",
    threadId:"t3",
    internalDate:String(new Date("2026-10-12T08:35:30Z").getTime()),
    snippet:"Current organiser contacts",
    payload:{
      headers:[
        {name:"From",value:"Margot Byrne <mt.trio13@gmail.com>"},
        {name:"To",value:"cameron@timbrepa.com.au"},
        {name:"Subject",value:"2026 AFGRI Mountain Country Music Muster"}
      ],
      parts:[{mimeType:"text/plain",body:{data:b64("Margot 0419 751 801; John 0427 279 270.")}}]
    }
  }]};
  const normal=normalizeGmailThread(thread,{title:"Mt Trio Muster",startDate:"2026-10-29",clientName:"Mt Trio Bush Camp & Caravan Park",contactEmails:["mt.trio13@gmail.com"]});
  const contact=proposalsForNormalizedThread(normal).find(item=>item.fieldKey==="contact");
  expect(contact?.value).toMatchObject({name:"Margot Byrne",email:"mt.trio13@gmail.com",phone:"0419 751 801"});
});
