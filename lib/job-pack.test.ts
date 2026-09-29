import { describe,expect,it } from "vitest";
import { isPlanDocument,jobPackContents } from "@/lib/job-pack";
import type { JobPackInput } from "@/lib/job-pack";
describe("job pack content",()=>{
  it("contains the operational sections required on the day",()=>{const result=jobPackContents({job:{contact_name:"Jamie"} as JobPackInput["job"],client:null,pack:[],changes:[],requirements:[],documents:[],links:[]});expect(result.sections).toEqual(expect.arrayContaining(["Schedule","On-day contacts","Venue and access","Technical details","Programme, performers and changeovers","Pack checklist","Outstanding questions","Plans and attachments"]));});
  it("does not claim a plan from text alone",()=>{const result=jobPackContents({job:{brief:"Site plan was mentioned"} as JobPackInput["job"],client:null,pack:[],changes:[],requirements:[],documents:[],links:[]});expect(result.hasActualPlan).toBe(false);});
  it("recognises actual plan document records",()=>{expect(isPlanDocument({name:"Mad Hatters Site Plan.pdf",category:"document"})).toBe(true);});
});
