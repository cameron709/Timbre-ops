import { describe,expect,it } from "vitest";
import { extractProposals,markConflicts } from "./extraction";

describe("email extraction",()=>{
  const evidence={threadId:"t1",messageId:"m1",sentAt:"2026-09-21T06:00:00Z",subject:"Vendor information",body:"You are welcome to arrive from 8:30am. The event starts at 10am. Please call or text 0447 125 779 (Jamie Murphy)."};
  it("extracts reviewable schedule and contact proposals",()=>{const proposals=extractProposals(evidence);expect(proposals.find(x=>x.fieldKey==="arrival_at")?.value).toEqual({time:"08:30"});expect(proposals.find(x=>x.fieldKey==="contact")?.text).toContain("Jamie Murphy");});
  it("uses stable idempotency keys",()=>{expect(extractProposals(evidence)[0].idempotencyKey).toBe(extractProposals(evidence)[0].idempotencyKey);});
  it("marks every competing value in a conflict",()=>{const proposals=[...extractProposals(evidence),...extractProposals({...evidence,messageId:"m2",body:"You are welcome to arrive from 9:00am."})],arrivals=markConflicts(proposals).filter(x=>x.fieldKey==="arrival_at");expect(arrivals).toHaveLength(2);expect(arrivals.every(x=>x.conflictGroup==="conflict:arrival_at")).toBe(true);});
  it("extracts reviewable date, venue, equipment and questions",()=>{const proposals=extractProposals({...evidence,body:"Friday 2 October 2026 at Albany Town Square. We need 2 microphones. Is power available?"});expect(proposals.find(x=>x.fieldKey==="start_date")?.value).toEqual({date:"2026-10-02"});expect(proposals.find(x=>x.fieldKey==="venue")?.value).toBe("Albany Town Square");expect(proposals.find(x=>x.fieldKey==="pack_item")?.value).toEqual({name:"microphones",quantity:2});expect(proposals.some(x=>x.fieldKey==="open_question")).toBe(true);});
});
