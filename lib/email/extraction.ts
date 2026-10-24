import { createHash } from "node:crypto";

export type Evidence = { threadId: string; messageId: string; sentAt: string | null; subject: string; body: string; from?: string; attachmentId?: string; filename?: string; mimeType?: string };
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

const datePattern = "(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)?,?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(20\\d{2})";

export function stripQuotedHistory(body: string) {
  const normalised = body
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "");
  const lines = normalised.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^On .{3,} wrote:$/i.test(trimmed) ||
      /^From:\s+.+/i.test(trimmed) ||
      /^-{2,}\s*Original Message\s*-{2,}$/i.test(trimmed) ||
      /^_{5,}$/.test(trimmed)
    ) break;
    if (/^>/.test(trimmed)) continue;
    kept.push(line.replace(/[ \t]+$/g, ""));
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function classifyDocument(filename: string) {
  if (/site.?map|site.?plan/i.test(filename)) return "site_plan";
  if (/stage.?plot|stage.?plan/i.test(filename)) return "stage_plot";
  if (/run.?sheet|program|programme/i.test(filename)) return "run_sheet";
  if (/invoice|\binv[-_ ]?\d/i.test(filename)) return "invoice";
  if (/quote|\bsq[-_ ]?\d/i.test(filename)) return "quote";
  return "other";
}

export function shouldProposeDocument(filename: string, mimeType?: string) {
  const documentType = classifyDocument(filename);
  if (documentType !== "other") return true;
  if (/^image\//i.test(mimeType ?? "") || /\.(?:png|jpe?g|gif|webp|svg)$/i.test(filename)) return false;
  return /\.(?:pdf|docx?|xlsx?|csv|txt)$/i.test(filename) || /pdf|wordprocessingml|spreadsheetml|text\//i.test(mimeType ?? "");
}

function dateFromMatch(match: RegExpMatchArray) {
  return `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, "0")}`;
}

function externalContact(evidence: Evidence, cleanText: string) {
  if (!evidence.from) return null;
  const email = evidence.from.match(/[\w.+-]+@[\w.-]+/)?.[0]?.toLowerCase();
  if (!email || /@timbrepa\.com\.au$|@billcue\.com\.au$/i.test(email)) return null;
  const displayName = evidence.from.replace(/<[^>]+>/g, "").replace(/^['\"]|['\"]$/g, "").trim();
  const phoneRegex=/\b0\d{3}\s?\d{3}\s?\d{3}\b/g;
  const phones=[...cleanText.matchAll(phoneRegex)].map(match=>match[0].replace(/\s+/g," "));
  const firstName=displayName.split(/\s+/)[0]?.toLowerCase();
  const namedLine=firstName?cleanText.split("\n").find(line=>line.toLowerCase().includes(firstName)&&/\b0\d{3}\s?\d{3}\s?\d{3}\b/.test(line)):undefined;
  const namedPhone=namedLine?.match(/\b0\d{3}\s?\d{3}\s?\d{3}\b/)?.[0]?.replace(/\s+/g," ");
  const phone=namedPhone??(phones.length===1?phones[0]:undefined);
  if (!displayName && !email) return null;
  return { name: displayName || email, email, phone };
}

function quotePackProposals(evidence: Evidence, cleanText: string) {
  const results: ExtractedProposal[] = [];
  const lines = cleanText.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const direct = line.match(/^(\d+)\s*[x×]\s+(.+?)$/i);
    if (direct) {
      const quantity = Number(direct[1]);
      const name = direct[2].trim();
      if (quantity > 0 && name.length > 1) {
        results.push(proposal(evidence, "pack_item", { name, quantity }, `${quantity} × ${name}`, 0.96, line));
      }
      continue;
    }
    const priced = line.match(/^(.+?)\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/);
    if (!priced) continue;
    const name = priced[1].trim();
    const quantity = Number(priced[2]);
    if (/^technical crew$/i.test(name)) {
      results.push(proposal(
        evidence,
        "requirement",
        { key: "staffing_technical_crew", label: "Technical Crew", detail: `${quantity} quoted labour hours` },
        `Technical Crew: ${quantity} quoted hours`,
        0.96,
        line
      ));
      continue;
    }
    if (/^audio package$/i.test(name)) continue;
    if (/^(?:total|gst|quote)/i.test(name)) continue;
    results.push(proposal(evidence, "pack_item", { name, quantity }, `${quantity} × ${name}`, 0.94, line));
  }
  return results;
}

function semanticConflictKey(item: ExtractedProposal) {
  if (["document", "open_question"].includes(item.fieldKey)) return null;
  if (["site_note", "requirement", "pack_item"].includes(item.fieldKey) && typeof item.value === "object" && item.value) {
    const value = item.value as Record<string, unknown>;
    const semantic = value.key ?? value.name;
    return semantic ? `${item.fieldKey}:${String(semantic).toLowerCase()}` : item.fieldKey;
  }
  return item.fieldKey;
}

export function extractProposals(evidence: Evidence): ExtractedProposal[] {
  const cleanText = stripQuotedHistory(evidence.body);
  const text = cleanText.replace(/\s+/g, " ").trim();
  const results: ExtractedProposal[] = [];
  const documentType = evidence.filename ? classifyDocument(evidence.filename) : null;

  if (evidence.filename && shouldProposeDocument(evidence.filename, evidence.mimeType)) {
    results.push(proposal(
      evidence,
      "document",
      { filename: evidence.filename, mimeType: evidence.mimeType, documentType },
      evidence.filename,
      1,
      `Attached file: ${evidence.filename}`
    ));
  }

  if (!evidence.filename) {
    const range = cleanText.match(/(?:^|\n)\s*(?:event\s*)?(?:times?|hours?)\s*:\s*(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))\s*(?:-|–|—|to|until)\s*(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/im);
    if (range) {
      const start = time(range[1]);
      const end = time(range[2]);
      if (start) results.push(proposal(evidence, "start_at", { time: start }, `Event start: ${start}`, 0.97, range[0].trim(), "schedule:start_at"));
      if (end) results.push(proposal(evidence, "end_at", { time: end }, `Event end: ${end}`, 0.97, range[0].trim(), "schedule:end_at"));
    }
  }

  const rules: Array<[string, RegExp, string]> = [
    ["arrival_at", /(?:arrive|arrival|welcome to arrive|on site|onsite)[^.!?]{0,45}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i, "Arrival"],
    ["bump_in_at", /(?:early |official )?bump[ -]?in[^.!?]{0,30}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i, "Bump-in"],
    ["soundcheck_at", /sound ?check[^.!?]{0,35}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i, "Soundcheck"],
    ["start_at", /(?:event (?:starts?|is happening)|opening)[^.!?]{0,30}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i, "Event start"],
    ["end_at", /(?:event (?:ends?|concludes?)|closing)[^.!?]{0,30}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i, "Event end"],
    ["bump_out_at", /(?:bump[ -]?out|site cleared)[^.!?]{0,30}?(\d{1,2}(?:(?::|\.)\d{2})?\s*(?:am|pm))/i, "Bump-out"]
  ];
  for (const [field, regex, label] of rules) {
    const match = text.match(regex);
    if (!match) continue;
    const parsed = time(match[1]);
    if (parsed && !results.some((item) => item.fieldKey === field && JSON.stringify(item.value) === JSON.stringify({ time: parsed }))) {
      results.push(proposal(evidence, field, { time: parsed }, `${label}: ${parsed}`, 0.9, match[0], `schedule:${field}`));
    }
  }

  const dateRange=text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*(?:-|–|—|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(20\d{2}))?/i);
  if(dateRange){
    const startIndex=dateRange.index??0;
    const nearby=text.slice(Math.max(0,startIndex-140),startIndex+dateRange[0].length+30);
    const nearbyYear=nearby.match(/\b(20\d{2})\b/)?.[1];
    const sourceYear=evidence.sentAt?String(new Date(evidence.sentAt).getUTCFullYear()):undefined;
    const year=dateRange[5]??nearbyYear??sourceYear;
    if(year){
      const startDate=`${year}-${months[dateRange[2].toLowerCase()]}-${dateRange[1].padStart(2,"0")}`;
      const endYear=Number(months[dateRange[4].toLowerCase()])<Number(months[dateRange[2].toLowerCase()])?String(Number(year)+1):year;
      const endDate=`${endYear}-${months[dateRange[4].toLowerCase()]}-${dateRange[3].padStart(2,"0")}`;
      const confidence=dateRange[5]||nearbyYear?0.96:0.88;
      results.push(proposal(evidence,"start_date",{date:startDate},`Event date: ${startDate}`,confidence,dateRange[0],"schedule:start_date"));
      results.push(proposal(evidence,"end_date",{date:endDate},`Event end date: ${endDate}`,confidence,dateRange[0],"schedule:end_date"));
    }
  }

  const labelledDate = cleanText.match(new RegExp(`(?:^|\\n)\\s*(?:event\\s*)?date\\s*:\\s*${datePattern}`, "im"));
  const contextualDate = labelledDate ?? text.match(new RegExp(`(?:event|function|awards?|show|dinner)[^.!?]{0,55}?(?:on|for|date\\s*:?)[^.!?]{0,20}?${datePattern}`, "i"));
  if (contextualDate) {
    const date = dateFromMatch(contextualDate);
    if(!results.some(item=>item.fieldKey==="start_date"&&JSON.stringify(item.value)===JSON.stringify({date}))){
      results.push(proposal(evidence, "start_date", { date }, `Event date: ${date}`, 0.97, contextualDate[0].trim(), "schedule:start_date"));
    }
  }

  const labelledVenue = cleanText.match(/(?:^|\n)\s*(?:location|venue)\s*:\s*([^\n\r]{3,100})/im);
  const navigationVenue=cleanText.match(/(?:just\s+)?put in\s+["“]?([^"”\n\r]{3,100})["”]?/i);
  const venue = labelledVenue?.[1]?.trim() ?? navigationVenue?.[1]?.trim() ?? text.match(/\b(?:held |happening )?at\s+([A-Z][A-Za-z0-9 '&.-]{3,60}?)(?=\s*(?:[,.]|on\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|from\s+\d|$))/)?.[1]?.trim();
  if (venue) results.push(proposal(evidence, "venue", venue, `Venue: ${venue}`, labelledVenue ? 0.97 : navigationVenue ? 0.94 : 0.82, labelledVenue?.[0]?.trim() ?? navigationVenue?.[0]?.trim() ?? venue));

  const contact = externalContact(evidence, cleanText);
  if (contact) {
    results.push(proposal(
      evidence,
      "contact",
      contact,
      `${contact.name}${contact.phone ? ` · ${contact.phone}` : ""}`,
      contact.phone ? 0.96 : 0.9,
      evidence.from ?? contact.email
    ));
  } else {
    const phone = text.match(/(?:call or text|contact[^.!?]{0,20})[^.!?]{0,45}?(0\d{3}\s?\d{3}\s?\d{3})\s*\(([^)]+)\)/i);
    if (phone) results.push(proposal(evidence, "contact", { name: phone[2].trim(), phone: phone[1].replace(/\s+/g, " ") }, `${phone[2].trim()} · ${phone[1]}`, 0.95, phone[0]));
  }

  if (!evidence.filename && /\b(?:please\s+)?(?:go ahead|proceed|happy to proceed|lock (?:this|it|everything|all)(?: all)? in|approved|approve (?:it|this|the quote))\b/i.test(text)) {
    results.push(proposal(evidence, "quote_status", "accepted", "Quote accepted", 0.98, text.slice(0, 220)));
  }

  if (documentType === "quote" || /\bquote\b/i.test(evidence.subject)) {
    const quoteReference = text.match(/\bSQ\d{4,}\b/i)?.[0]?.toUpperCase();
    if (quoteReference) results.push(proposal(evidence, "quote_reference", quoteReference, `Quote reference: ${quoteReference}`, 0.99, quoteReference));
    const total = text.match(/Total quoted\s*\$?\s*([\d,]+\.\d{2})/i)?.[1];
    if (total) {
      const value = Number(total.replace(/,/g, ""));
      results.push(proposal(evidence, "quoted_value", value, `Quoted value: $${value.toFixed(2)}`, 0.99, `Total quoted $${total}`));
    }
    results.push(...quotePackProposals(evidence, cleanText));
  }

  if (!evidence.filename && /\binvoice\b/i.test(text)) {
    const invoiceReference = evidence.subject.match(/^\s*(\d{2,})\s+from\s+Timbre Pro Audio/i)?.[1];
    if (invoiceReference) results.push(proposal(evidence, "invoice_reference", invoiceReference, `Invoice reference: ${invoiceReference}`, 0.94, evidence.subject));
    if (/\b(?:invoice|owing|view and download your invoice)\b/i.test(text)) results.push(proposal(evidence, "invoice_status", "sent", "Invoice sent", 0.9, text.slice(0, 220)));
  }

  if (!evidence.filename && /\bsame as (?:last|previous) year\b/i.test(text)) {
    const excerpt = text.match(/[^.!?]{0,80}\bsame as (?:last|previous) year\b[^.!?]{0,120}[.!?]?/i)?.[0]?.trim() ?? "Same as last year";
    results.push(proposal(
      evidence,
      "requirement",
      { key: "match_previous_production", label: "Match previous production", detail: excerpt },
      "Match previous production",
      0.9,
      excerpt
    ));
  }

  if (!evidence.filename && /\bclicker\b|presentation remote/i.test(text)) {
    const excerpt = text.match(/[^.!?]{0,90}(?:clicker|presentation remote)[^.!?]{0,150}[.!?]?/i)?.[0]?.trim() ?? "Presentation clicker requirement";
    results.push(proposal(
      evidence,
      "requirement",
      { key: "presentation_clicker", label: "Presentation laptop and clicker", detail: excerpt },
      "Presentation laptop and clicker",
      0.94,
      excerpt
    ));
  }

  if(!evidence.filename){
    const directions=cleanText.match(/(?:^|\n)\s*DIRECTIONS:\s*\n?([\s\S]{20,1800}?)(?=\n\s*(?:Margot(?:\s+and\s+John)?\s+Byrne|Regards|Cheers)\b|$)/i);
    if(directions){
      results.push(proposal(evidence,"site_note",{key:"access",text:directions[1].trim()},`Access: ${directions[1].trim()}`,0.92,directions[0].trim()));
    }
  }

  if (!["quote", "invoice"].includes(documentType ?? "")) {
    const siteRules: Array<[string, RegExp, string]> = [
      ["access", /(?:access|parking|loading|entry)[^.!?]{4,180}[.!?]?/i, "Access"],
      ["power", /(?:power|generator|3 phase|three phase)[^.!?]{4,180}[.!?]?/i, "Power"],
      ["foh", /(?:FOH|front of house|mix position)[^.!?]{4,180}[.!?]?/i, "FOH"],
      ["cable_runs", /(?:cable runs?|cable path|cable ramp)[^.!?]{4,180}[.!?]?/i, "Cable runs"]
    ];
    for (const [keyName, regex, label] of siteRules) {
      const match = text.match(regex);
      if (match && !results.some(item=>item.fieldKey==="site_note"&&typeof item.value==="object"&&item.value&&"key" in item.value&&(item.value as {key?:string}).key===keyName)) results.push(proposal(evidence, "site_note", { key: keyName, text: match[0].trim() }, `${label}: ${match[0].trim()}`, 0.78, match[0]));
    }

    const equipment = /\b(\d+)\s*[x×]?\s+(wireless\s+)?(DI(?: boxes?)?|microphones?|mics?|guitars?|speakers?|monitors?|amps?|drum\s*kits?|keyboards?|banjos?)\b/gi;
    for (const match of text.matchAll(equipment)) {
      const quantity = Number(match[1]);
      const name = `${match[2] ?? ""}${match[3]}`.trim();
      results.push(proposal(evidence, "pack_item", { name, quantity }, `${quantity} × ${name}`, 0.8, match[0]));
    }
    const drumKit=text.match(/\b(?:need|require|booked|confirmed)[^.!?]{0,90}\bdrum\s*kit\b/i);
    if(drumKit&&!results.some(item=>item.fieldKey==="pack_item"&&typeof item.value==="object"&&item.value&&"name" in item.value&&/drum\s*kit/i.test(String((item.value as {name?:unknown}).name)))){
      results.push(proposal(evidence,"pack_item",{name:"Drum kit",quantity:1},"1 × Drum kit",0.86,drumKit[0]));
    }
  }

  const staffing = text.match(/\b(sound technician|audio technician|lighting technician|stage manager|crew member|operator)\b/i);
  if (staffing) results.push(proposal(evidence, "requirement", { key: `staffing_${staffing[1].toLowerCase().replace(/\s+/g, "_")}`, label: staffing[1], detail: staffing[0] }, `Staffing: ${staffing[1]}`, 0.82, staffing[0]));

  for (const match of text.matchAll(/(?:^|[.!]\s+)([^.!?]{8,180}\?)/g)) {
    const question = match[1].trim();
    results.push(proposal(evidence, "open_question", question, question, 0.92, question));
  }

  if (text && /run sheet|program|programme/i.test(evidence.filename ?? evidence.subject)) {
    results.push(proposal(evidence, "programme_notes", text.slice(0, 4000), "Programme from attached run sheet", 0.85, text.slice(0, 280)));
  }
  return results;
}

export function markConflicts(proposals: ExtractedProposal[]) {
  const values = new Map<string, Set<string>>();
  for (const item of proposals) {
    const conflictKey = semanticConflictKey(item);
    if (!conflictKey) continue;
    const group = values.get(conflictKey) ?? new Set<string>();
    group.add(JSON.stringify(item.value));
    values.set(conflictKey, group);
  }
  return proposals.map((item) => {
    const conflictKey = semanticConflictKey(item);
    return conflictKey && (values.get(conflictKey)?.size ?? 0) > 1 ? { ...item, conflictGroup: `conflict:${conflictKey}` } : item;
  });
}
