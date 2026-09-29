import { describe,expect,it } from "vitest";
import { scoreThreadMatch } from "./matching";

describe("scoreThreadMatch",()=>{
  const job={title:"Mad Hatter Tea Party",venue:"Albany Town Square",startDate:"2026-10-02",clientName:"headspace Albany",contactEmails:["jamie@headspace.org.au"]};
  it("requires corroboration beyond a similar subject",()=>{expect(scoreThreadMatch(job,{subject:"Mad Hatter costume ideas",participants:["shop@example.com"],messageDates:["2026-09-20"]}).eligible).toBe(false);});
  it("accepts event and known contact evidence",()=>{const result=scoreThreadMatch(job,{subject:"Mad Hatter Tea Party 2026",participants:["jamie@headspace.org.au"],messageDates:["2026-09-21"]});expect(result.eligible).toBe(true);expect(result.reasons.join(" ")).toContain("contact");});
});
