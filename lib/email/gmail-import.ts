import { createHash } from "node:crypto";
import { extractProposals,markConflicts,type Evidence } from "./extraction";
import { scoreThreadMatch,type MatchJob } from "./matching";

type Part={mimeType?:string;filename?:string;headers?:Array<{name:string;value:string}>;body?:{data?:string;attachmentId?:string;size?:number};parts?:Part[]};
type NormalizedAttachment={gmailAttachmentId:string|null;filename:string;mimeType:string|null;sizeBytes:number|null;extractedText?:string;extractionError?:string};
export type GmailMessage={id:string;threadId:string;internalDate:string;snippet?:string;payload?:Part};
export type GmailThread={id:string;messages:GmailMessage[]};
const decode=(value?:string)=>value?Buffer.from(value.replace(/-/g,"+").replace(/_/g,"/"),"base64").toString("utf8"):"";
const header=(part:Part|undefined,name:string)=>part?.headers?.find(item=>item.name.toLowerCase()===name.toLowerCase())?.value??"";
const flatten=(part:Part|undefined):Part[]=>part?[part,...(part.parts??[]).flatMap(flatten)]:[];
const address=(value:string)=>[...value.matchAll(/[\w.+-]+@[\w.-]+/g)].map(match=>match[0].toLowerCase());
const PROPOSAL_HISTORY_DAYS=300;

export function normalizeGmailThread(thread:GmailThread,job:MatchJob){const messages=thread.messages.map(message=>{const parts=flatten(message.payload),body=parts.filter(part=>part.mimeType==="text/plain").map(part=>decode(part.body?.data)).join("\n")||parts.filter(part=>part.mimeType==="text/html").map(part=>decode(part.body?.data)).join("\n");const from=header(message.payload,"from"),to=header(message.payload,"to"),subject=header(message.payload,"subject"),attachments:NormalizedAttachment[]=parts.filter(part=>Boolean(part.filename)).map(part=>({gmailAttachmentId:part.body?.attachmentId??null,filename:part.filename!,mimeType:part.mimeType??null,sizeBytes:part.body?.size??null}));return{id:message.id,threadId:thread.id,sentAt:new Date(Number(message.internalDate)).toISOString(),from,to:address(to),participants:[...address(from),...address(to)],subject,snippet:message.snippet??null,body,hash:createHash("sha256").update(body).digest("hex"),attachments};}).sort((a,b)=>a.sentAt.localeCompare(b.sentAt));const latest=messages.at(-1),participants=[...new Set(messages.flatMap(message=>message.participants))],match=scoreThreadMatch(job,{subject:latest?.subject??"",snippet:latest?.snippet,participants,messageDates:messages.map(message=>message.sentAt)});return{id:thread.id,subject:latest?.subject||"(no subject)",snippet:latest?.snippet??null,participants,latestMessageAt:latest?.sentAt??null,gmailUrl:`https://mail.google.com/mail/u/0/#all/${thread.id}`,messages,match};}

export function proposalsForNormalizedThread(thread:ReturnType<typeof normalizeGmailThread>){const latestTime=thread.latestMessageAt?new Date(thread.latestMessageAt).getTime():null;const cutoff=latestTime===null?null:latestTime-PROPOSAL_HISTORY_DAYS*86400000;const currentMessages=thread.messages.filter(message=>cutoff===null||new Date(message.sentAt).getTime()>=cutoff);const proposals=currentMessages.flatMap(message=>{const base:Evidence={threadId:thread.id,messageId:message.id,sentAt:message.sentAt,subject:message.subject,body:message.body,from:message.from};return[...extractProposals(base),...message.attachments.flatMap(attachment=>extractProposals({...base,body:attachment.extractedText??"",attachmentId:attachment.gmailAttachmentId??undefined,filename:attachment.filename,mimeType:attachment.mimeType??undefined}))];});return markConflicts(proposals);}

const SEARCH_GENERIC_WORDS=new Set(["event","show","festival","awards","award","music","party","concert","gala","function"]);
const searchWords=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ").filter(word=>word.length>2&&!SEARCH_GENERIC_WORDS.has(word));
const searchDate=(value:Date)=>`${value.getUTCFullYear()}/${String(value.getUTCMonth()+1).padStart(2,"0")}/${String(value.getUTCDate()).padStart(2,"0")}`;

export function buildGmailSearch(job:MatchJob){
  const title=job.title.replace(/"/g,"").trim();
  const titleWords=[...new Set(searchWords(title))];
  const terms=[
    `"${title}"`,
    ...titleWords,
    ...(job.contactEmails??[]).map(email=>`from:${email}`),
    job.clientName?`"${job.clientName.replace(/"/g,"")}"`:null
  ].filter(Boolean);
  let window="";
  if(job.startDate){
    const eventDate=new Date(job.startDate);
    if(Number.isFinite(eventDate.getTime())){
      const after=new Date(eventDate.getTime()-PROPOSAL_HISTORY_DAYS*86400000);
      const before=new Date(eventDate.getTime()+90*86400000);
      window=` after:${searchDate(after)} before:${searchDate(before)}`;
    }
  }
  return `{${terms.join(" ")}}${window} -in:spam -in:trash`;
}
