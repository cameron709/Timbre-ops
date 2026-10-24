import { describe,expect,it } from "vitest";
import { scoreThreadMatch } from "./matching";

describe("scoreThreadMatch",()=>{
  const job={title:"Mad Hatter Tea Party",venue:"Albany Town Square",startDate:"2026-10-02",clientName:"headspace Albany",contactEmails:["jamie@headspace.org.au"]};
  it("requires corroboration beyond a similar subject",()=>{expect(scoreThreadMatch(job,{subject:"Mad Hatter costume ideas",participants:["shop@example.com"],messageDates:["2026-09-20"]}).eligible).toBe(false);});
  it("accepts event and known contact evidence",()=>{const result=scoreThreadMatch(job,{subject:"Mad Hatter Tea Party 2026",participants:["jamie@headspace.org.au"],messageDates:["2026-09-21"]});expect(result.eligible).toBe(true);expect(result.reasons.join(" ")).toContain("contact");});
  it("rejects a previous-year thread even when title and contact match",()=>{const result=scoreThreadMatch(job,{subject:"Mad Hatter Tea Party 2025",participants:["jamie@headspace.org.au"],messageDates:["2025-10-02"]});expect(result.eligible).toBe(false);expect(result.reasons.join(" ")).toContain("historical thread");});
  it("matches a shorthand job title to a longer event name using participant identity",()=>{const result=scoreThreadMatch({title:"Mt Trio Muster",startDate:"2026-10-29"},{subject:"2026 AFGRI Mountain Country Music Muster",snippet:"Event programme timetable",participants:["mt.trio13@gmail.com","cameron@timbrepa.com.au"],messageDates:["2026-10-12"]});expect(result.eligible).toBe(true);expect(result.reasons.join(" ")).toContain("event keyword: muster");expect(result.reasons.join(" ")).toContain("participant identity: trio");});
});
