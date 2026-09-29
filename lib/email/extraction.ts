import { createHash } from "node:crypto";

export type Evidence = { threadId: string; messageId: string; sentAt: string | null; subject: string; body: string; attachmentId?: string; filename?: string; mimeType?: string };
export type ExtractedProposal = { fieldKey: string; value: unknown; text: string; confidence: number; excerpt: string; sourceDate: string | null; sourceMessageId: string; sourceAttachmentId?: string; idempotencyKey: string; conflictGroup?: string };

const key = (e: Evidence, field: string, text: string) => createHash("sha256").update(`${e.messageId}:${e.attachmentId ?? "body"}:${field}:${text}`).digest("hex");
const proposal = (e: Evidence, fieldKey: string, value: unknown, text: string, confidence: number, excerpt: string, conflictGroup?: string): ExtractedProposal => ({ fieldKey, value, text, confidence, excerpt, sourceDate: e.sentAt, sourceMessageId:e.messageId, sourceAttachmentId:e.attachmentId, idempotencyKey: key(e, fieldKey, text), conflictGroup });
const time = (raw: string) => {
  const match = raw.match(/(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?/i) ?? raw.match(/(\d{1,2})\s*(am|pm)/i);
  if (!match) return null;
  let hour = Number(match[1]); const minute = match[2]?.length === 2 && /\d/.test(match[2]) ? Number(match[2]) : 0;
  const suffix = (match[3] ?? match[2] ?? "").toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12; if (suffix === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
};
const months:Record<string,string>={january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",july:"07",august:"08",september:"09",october:"10",november:"11",december:"12"};

export function classifyDocument(filename: string) {
  if (/site.?map|site.?plan/i.test(filename)) return "site_plan";
  if (/stage.?plot|stage.?plan/i.test(filename)) return "stage_plot";
  if (/run.?sheet|program/i.test(filename)) return "run_sheet";
  return "other";
}

export function extractProposals(evidence: Evidence): ExtractedProposal[] {
  const text = evidence.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const results: ExtractedProposal[] = [];
  if (evidence.filename) results.push(proposal(evidence, "document", { filename:evidence.filename, mimeType:evidence.mimeType, documentType:classifyDocument(evidence.filename) }, evidence.filename, 1, `Attached file: ${evidence.filename}`));
  const rules: Array<[string,RegExp,string]> = [
    ["arrival_at",/(?:arrive|arrival|welcome to arrive|on site|onsite)[^.!?]{0,45}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i,"Arrival"],
    ["bump_in_at",/(?:early |official )?bump[ -]?in[^.!?]{0,30}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i,"Bump-in"],
    ["soundcheck_at",/sound ?check[^.!?]{0,35}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i,"Soundcheck"],
    ["start_at",/(?:event (?:starts?|is happening)|opening)[^.!?]{0,30}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i,"Event start"],
    ["end_at",/(?:event (?:ends?|concludes?)|closing)[^.!?]{0,30}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i,"Event end"],
    ["bump_out_at",/(?:bump[ -]?out|site cleared)[^.!?]{0,30}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i,"Bump-out"]
  ];
  for (const [field,regex,label] of rules) { const match=text.match(regex); if(match){const parsed=time(match[1]);if(parsed)results.push(proposal(evidence,field,{time:parsed},`${label}: ${parsed}`,0.9,match[0],`schedule:${field}`));} }
  const eventDate=text.match(/(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)?,?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);
  if(eventDate){const date=`${eventDate[3]}-${months[eventDate[2].toLowerCase()]}-${eventDate[1].padStart(2,"0")}`;results.push(proposal(evidence,"start_date",{date},`Event date: ${date}`,0.94,eventDate[0],"schedule:start_date"));}
  const venue=text.match(/\b(?:held |happening )?at\s+([A-Z][A-Za-z0-9 '&.-]{3,60}?)(?=\s*(?:[,.]|on\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|from\s+\d|\n|$))/);
  if(venue)results.push(proposal(evidence,"venue",venue[1].trim(),`Venue: ${venue[1].trim()}`,0.82,venue[0]));
  const phone = text.match(/(?:call or text|contact[^.!?]{0,20})[^.!?]{0,45}?(0\d{3}\s?\d{3}\s?\d{3})\s*\(([^)]+)\)/i);
  if(phone) results.push(proposal(evidence,"contact",{name:phone[2].trim(),phone:phone[1].replace(/\s/g," ")},`${phone[2].trim()} · ${phone[1]}`,0.95,phone[0]));
  const siteRules:Array<[string,RegExp,string]>=[
    ["access",/(?:access|parking|loading|entry)[^.!?]{4,180}[.!?]?/i,"Access"],
    ["power",/(?:power|generator|3 phase|three phase)[^.!?]{4,180}[.!?]?/i,"Power"],
    ["foh",/(?:FOH|front of house|mix position)[^.!?]{4,180}[.!?]?/i,"FOH"],
    ["cable_runs",/(?:cable runs?|cable path|cable ramp)[^.!?]{4,180}[.!?]?/i,"Cable runs"]
  ];
  for(const[keyName,regex,label]of siteRules){const match=text.match(regex);if(match)results.push(proposal(evidence,"site_note",{key:keyName,text:match[0].trim()},`${label}: ${match[0].trim()}`,0.78,match[0]));}
  const equipment=/\b(\d+)(?:\s*[–-]\s*\d+)?\s+(wireless\s+)?(DI(?: boxes?)?|microphones?|mics?|guitars?|speakers?|monitors?)\b/gi;
  for(const match of text.matchAll(equipment)){const quantity=Number(match[1]),name=`${match[2]??""}${match[3]}`.trim();results.push(proposal(evidence,"pack_item",{name,quantity},`${quantity} × ${name}`,0.8,match[0]));}
  const staffing=text.match(/\b(sound technician|audio technician|lighting technician|stage manager|crew member|operator)\b/i);
  if(staffing)results.push(proposal(evidence,"requirement",{key:`staffing_${staffing[1].toLowerCase().replace(/\s+/g,"_")}`,label:staffing[1],notes:staffing[0]},`Staffing: ${staffing[1]}`,0.82,staffing[0]));
  for(const match of text.matchAll(/(?:^|[.!]\s+)([^.!?]{8,180}\?)/g)){const question=match[1].trim();results.push(proposal(evidence,"open_question",question,question,0.92,question));}
  if (text && /run sheet|program|programme/i.test(evidence.filename ?? evidence.subject)) results.push(proposal(evidence,"programme_notes",text.slice(0,4000),"Programme from attached run sheet",0.85,text.slice(0,280)));
  return results;
}

export function markConflicts(proposals: ExtractedProposal[]) {
  const values = new Map<string,Set<string>>();
  for (const item of proposals) {
    const group = values.get(item.fieldKey) ?? new Set<string>();
    group.add(JSON.stringify(item.value));
    values.set(item.fieldKey, group);
  }
  return proposals.map((item) => values.get(item.fieldKey)!.size > 1 ? { ...item, conflictGroup: `conflict:${item.fieldKey}` } : item);
}
