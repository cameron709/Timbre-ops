import { describe,expect,it } from "vitest";
import { extractProposals,markConflicts,shouldProposeDocument,stripQuotedHistory } from "./extraction";

describe("email extraction",()=>{
  const evidence={threadId:"t1",messageId:"m1",sentAt:"2026-09-21T06:00:00Z",subject:"Vendor information",body:"You are welcome to arrive from 8:30am. The event starts at 10am. Please call or text 0447 125 779 (Jamie Murphy)."};
  it("extracts reviewable schedule and contact proposals",()=>{const proposals=extractProposals(evidence);expect(proposals.find(x=>x.fieldKey==="arrival_at")?.value).toEqual({time:"08:30"});expect(proposals.find(x=>x.fieldKey==="contact")?.text).toContain("Jamie Murphy");});
  it("uses stable idempotency keys",()=>{expect(extractProposals(evidence)[0].idempotencyKey).toBe(extractProposals(evidence)[0].idempotencyKey);});
  it("marks every competing value in a conflict",()=>{const proposals=[...extractProposals(evidence),...extractProposals({...evidence,messageId:"m2",body:"You are welcome to arrive from 9:00am."})],arrivals=markConflicts(proposals).filter(x=>x.fieldKey==="arrival_at");expect(arrivals).toHaveLength(2);expect(arrivals.every(x=>x.conflictGroup==="conflict:arrival_at")).toBe(true);});
  it("extracts reviewable date, venue, equipment and questions",()=>{const proposals=extractProposals({...evidence,body:"Event date: Friday 2 October 2026\nLocation: Albany Town Square\nWe need 2 microphones. Is power available?"});expect(proposals.find(x=>x.fieldKey==="start_date")?.value).toEqual({date:"2026-10-02"});expect(proposals.find(x=>x.fieldKey==="venue")?.value).toBe("Albany Town Square");expect(proposals.find(x=>x.fieldKey==="pack_item")?.value).toEqual({name:"microphones",quantity:2});expect(proposals.some(x=>x.fieldKey==="open_question")).toBe(true);});
  it("stops at quoted reply history",()=>{const body="Date: 16th October 2026\nEvent Times: 6pm - 11pm\nFrom: Someone <old@example.com>\nDate: 8th October 2025\nThe event starts at 5pm";expect(stripQuotedHistory(body)).not.toContain("2025");const proposals=extractProposals({...evidence,body});expect(proposals.filter(x=>x.fieldKey==="start_date")).toHaveLength(1);expect(proposals.find(x=>x.fieldKey==="start_at")?.value).toEqual({time:"18:00"});expect(proposals.find(x=>x.fieldKey==="end_at")?.value).toEqual({time:"23:00"});});
  it("does not treat inline signature images as documents",()=>{expect(shouldProposeDocument("image002.png","image/png")).toBe(false);expect(shouldProposeDocument("Stage Plot.pdf","application/pdf")).toBe(true);});
  it("extracts current Wine Show instructions without quoted 2025 history",()=>{const body="Hi Cameron,\nDate: 16th October 2026\nEvent Times: 6pm - 11pm\nLocation: Retravision Stadium\nThe same as last year please. Plus I want to sort out the clicker problem.\nP: 0427 447 711\nFrom: Cameron Findlay <cameron@timbrepa.com.au>\nDate: Wednesday, 8 October 2025\nThe event starts at 6pm";const proposals=extractProposals({...evidence,subject:"Re: Quote",body,from:"Kahlia Ericson <info@wineshowwa.com.au>"});expect(proposals.find(x=>x.fieldKey==="start_date")?.value).toEqual({date:"2026-10-16"});expect(proposals.find(x=>x.fieldKey==="venue")?.value).toBe("Retravision Stadium");expect(proposals.find(x=>x.fieldKey==="contact")?.value).toMatchObject({name:"Kahlia Ericson",email:"info@wineshowwa.com.au",phone:"0427 447 711"});expect(proposals.filter(x=>x.fieldKey==="requirement")).toHaveLength(2);expect(JSON.stringify(proposals)).not.toContain("2025-10-08");});
  it("turns a quote document into commercial and pack proposals without a fake power site note",()=>{const body="SQ00128 05 Oct, 2026 $3,278.99\nTechnical Crew 10 72.80 7.28 800.80\nAudio Package 1 1,315.60 131.56 1,447.16\n1x Allen and Heath SQ6\n2x HK Polar 12\nStage Riser - 1m x 2m 8 78.00 7.80 686.40\nTotal quoted $3,278.99";const proposals=extractProposals({...evidence,messageId:"q1",subject:"Quote from Timbre Pro Audio",body,filename:"Quote-SQ00128-from-Timbre-Pro-Audio.pdf",mimeType:"application/pdf",attachmentId:"a1"});expect(proposals.find(x=>x.fieldKey==="quote_reference")?.value).toBe("SQ00128");expect(proposals.find(x=>x.fieldKey==="quoted_value")?.value).toBe(3278.99);expect(proposals.find(x=>x.fieldKey==="pack_item"&&x.text.includes("HK Polar 12"))?.value).toEqual({name:"HK Polar 12",quantity:2});expect(proposals.some(x=>x.fieldKey==="site_note")).toBe(false);});
  it("does not make unrelated documents conflict with each other",()=>{const proposals=markConflicts([extractProposals({...evidence,messageId:"d1",filename:"Quote-SQ00128.pdf",mimeType:"application/pdf",body:""})[0],extractProposals({...evidence,messageId:"d2",filename:"Run Sheet.pdf",mimeType:"application/pdf",body:""})[0]]);expect(proposals.every(x=>!x.conflictGroup)).toBe(true);});
  it("extracts the Mt Trio multi-day venue and access details",()=>{const body="DIRECTIONS:\nJust put in \"Mt Trio Bush Camp & Caravan Park\"\nTake a RIGHT into Salt River Rd. We are 2km from the corner.\nMargot and John Byrne";const proposals=extractProposals({...evidence,sentAt:"2026-10-14T06:11:52Z",subject:"2026 AFGRI Mountain Country Music Muster 29 October to 1st November",body,from:"Margot Byrne <mt.trio13@gmail.com>"});expect(proposals.find(x=>x.fieldKey==="start_date")?.value).toEqual({date:"2026-10-29"});expect(proposals.find(x=>x.fieldKey==="end_date")?.value).toEqual({date:"2026-11-01"});expect(proposals.find(x=>x.fieldKey==="venue")?.value).toBe("Mt Trio Bush Camp & Caravan Park");expect(proposals.find(x=>x.fieldKey==="site_note"&&(x.value as {key?:string}).key==="access")?.text).toContain("Salt River Rd");});
  it("does not assign another contact's phone number to the sender",()=>{const body="Cam ph 0457 073 282\nJason 0409 822 740\nMargot 0419 751 801\nJohn 0427 279 270";const contact=extractProposals({...evidence,body,from:"Margot Byrne <mt.trio13@gmail.com>"}).find(x=>x.fieldKey==="contact");expect(contact?.value).toMatchObject({name:"Margot Byrne",email:"mt.trio13@gmail.com",phone:"0419 751 801"});});
  it("extracts booked Muster backline from natural language",()=>{const proposals=extractProposals({...evidence,body:"We confirmed that we need the drum kit and 2 x amps for the Muster."}).filter(x=>x.fieldKey==="pack_item");expect(proposals.some(x=>JSON.stringify(x.value)===JSON.stringify({name:"Drum kit",quantity:1}))).toBe(true);expect(proposals.some(x=>JSON.stringify(x.value)===JSON.stringify({name:"amps",quantity:2}))).toBe(true);});

});


it("extracts Muster navigation, address, reception and specific backline",()=>{
  const proposals=extractProposals({
    threadId:"mt",
    messageId:"mt1",
    sentAt:"2026-10-14T06:11:52Z",
    subject:"AFGRI Mountain Country Music Muster 29 October to 1st November",
    body:"Navigate to \"Mt Trio Bush Camp & Caravan Park\", 4850 Salt River Rd, Amelup WA. Do not travel via Cranbrook. From Albany Highway after Arthur River: Woodanilling turnoff, Katanning, Broomehill, Gnowangerup, then Salt River Rd. Property is 2 km from the Salt River Rd turnoff. Reception can be patchy; Telstra works at the site.",
    from:"Margot Byrne <mt.trio13@gmail.com>",
    knownContact:true
  });
  expect(proposals.find(x=>x.fieldKey==="venue")?.value).toBe("Mt Trio Bush Camp & Caravan Park");
  expect(proposals.find(x=>x.fieldKey==="site_note"&&(x.value as {key?:string}).key==="address")?.text).toContain("4850 Salt River Rd");
  expect(proposals.find(x=>x.fieldKey==="site_note"&&(x.value as {key?:string}).key==="access")?.text).toContain("Cranbrook");
  expect(proposals.find(x=>x.fieldKey==="site_note"&&(x.value as {key?:string}).key==="reception")?.text).toContain("Telstra");
});

it("extracts one guitar amp and one bass amp from prose",()=>{
  const proposals=extractProposals({threadId:"mt",messageId:"mt2",sentAt:"2026-06-29T05:46:39Z",subject:"Re: Mt Trio Country Music Muster Quote",body:"The required backline is the drum kit, one guitar amp and one bass amp."}).filter(x=>x.fieldKey==="pack_item");
  expect(proposals.some(x=>JSON.stringify(x.value)===JSON.stringify({name:"Guitar amp",quantity:1}))).toBe(true);
  expect(proposals.some(x=>JSON.stringify(x.value)===JSON.stringify({name:"Bass amp",quantity:1}))).toBe(true);
});


it("does not treat attendee generator rules as production power",()=>{
  const proposals=extractProposals({
    threadId:"mt",
    messageId:"activities",
    sentAt:"2026-10-12T08:35:30Z",
    subject:"2026 AFGRI Mountain Country Music Muster",
    body:"Generators may only operate 8.00–10.00am and 5.00–7.00pm each day – just enough time to top up your batteries.",
    filename:"Mountain Country Music Muster Event Activities.pdf",
    mimeType:"application/pdf",
    attachmentId:"activities-pdf"
  });
  expect(proposals.some(item=>item.fieldKey==="site_note")).toBe(false);
  expect(proposals.some(item=>item.fieldKey==="pack_item")).toBe(false);
  expect(proposals.some(item=>item.fieldKey==="document")).toBe(true);
});
