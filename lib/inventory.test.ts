import { describe, expect, it } from "vitest";
import { bookingAvailability, expandPackage, fulfilmentForItem, packageWouldCreateCycle } from "@/lib/inventory";
import type { GearItem, InventoryPackage, Job, PackageItem, PackItem } from "@/types/database";

const now = "2026-10-24T00:00:00Z";
const item = (id:string,name:string,item_type:GearItem["item_type"]="product"):GearItem => ({
  id,name,category:"audio",quantity_owned:2,description:null,notes:null,photo_url:null,
  item_type,tracking_mode:item_type==="service"||item_type==="hire_in"?"non_stock":"pooled",
  unit:"each",active:true,sku:null,default_rate:null,replacement_value:null,created_at:now,updated_at:now
});
const pkg = (id:string,name:string):InventoryPackage => ({id,name,category:"audio",description:null,client_description:null,notes:null,active:true,created_at:now,updated_at:now});
const component = (patch:Partial<PackageItem>):PackageItem => ({
  id:patch.id??crypto.randomUUID(),package_id:patch.package_id??"pa",gear_item_id:patch.gear_item_id??null,
  child_package_id:patch.child_package_id??null,quantity:patch.quantity??1,client_visible:patch.client_visible??false,
  required:patch.required??true,notes:patch.notes??null,created_at:now
});

describe("inventory package expansion",()=>{
  it("does not send services to fulfilment",()=>{
    expect(fulfilmentForItem(item("engineer","Audio Engineer","service"),1)).toEqual([]);
  });

  it("expands nested packages and aggregates duplicate physical items",()=>{
    const gear=[item("top","ART 932"),item("sub","LS118"),item("engineer","Engineer","service")];
    const packages=[pkg("pa","PA Package"),pkg("tops","Top Package")];
    const packageItems=[
      component({id:"a",package_id:"pa",child_package_id:"tops",quantity:2}),
      component({id:"b",package_id:"pa",gear_item_id:"sub",quantity:2}),
      component({id:"c",package_id:"pa",gear_item_id:"engineer",quantity:1}),
      component({id:"d",package_id:"tops",gear_item_id:"top",quantity:1})
    ];
    expect(expandPackage("pa",2,packages,packageItems,gear).map((line)=>({name:line.item_name,quantity:line.quantity_planned}))).toEqual([
      {name:"ART 932",quantity:4},
      {name:"LS118",quantity:4}
    ]);
  });

  it("rejects recursive package cycles",()=>{
    const packages=[pkg("a","A"),pkg("b","B")];
    const packageItems=[component({id:"a-b",package_id:"a",child_package_id:"b"}),component({id:"b-a",package_id:"b",child_package_id:"a"})];
    expect(()=>expandPackage("a",1,packages,packageItems,[])).toThrow(/Package cycle/);
  });
});


describe("inventory hardening",()=>{
  it("blocks indirect package cycles before insert",()=>{
    const packageItems=[
      component({id:"a-b",package_id:"a",child_package_id:"b"}),
      component({id:"b-c",package_id:"b",child_package_id:"c"})
    ];
    expect(packageWouldCreateCycle("c","a",packageItems)).toBe(true);
    expect(packageWouldCreateCycle("c","b",packageItems)).toBe(true);
    expect(packageWouldCreateCycle("a","c",packageItems)).toBe(false);
  });

  it("checks availability only against overlapping projects",()=>{
    const top={...item("top","ART 932"),quantity_owned:2};
    const target={id:"target",title:"Target",status:"confirmed",date_precision:"date",start_date:"2026-11-01",end_date:null,event_date:"2026-11-01",start_at:null,end_at:null} as Job;
    const overlap={id:"overlap",title:"Overlap",status:"confirmed",date_precision:"date",start_date:"2026-11-01",end_date:null,event_date:"2026-11-01",start_at:null,end_at:null} as Job;
    const later={id:"later",title:"Later",status:"confirmed",date_precision:"date",start_date:"2026-11-02",end_date:null,event_date:"2026-11-02",start_at:null,end_at:null} as Job;
    const pack=(job_id:string,quantity_planned:number):PackItem=>({
      id:`${job_id}-top`,job_id,item_name:"ART 932",quantity_planned,quantity_packed:0,quantity_out:0,quantity_returned:0,state:"planned",
      notes:null,created_at:now,updated_at:now,source_ref:null,gear_item_id:"top",line_type:"catalogue",source_context:null,
      booking_id:null,package_id:null,asset_id:null
    });
    const drafts=fulfilmentForItem(top,2);
    const result=bookingAvailability(target,drafts,[top],[pack("overlap",1),pack("later",2)],[target,overlap,later]);
    expect(result.unknownDate).toBe(false);
    expect(result.conflicts).toEqual([expect.objectContaining({
      gearName:"ART 932",quantityOwned:2,existingDemand:1,requested:2,availableBefore:1,shortageAfter:1,conflictingProjects:["Overlap"]
    })]);
  });

  it("reports unknown availability when the target project has no date",()=>{
    const target={id:"target",title:"Target",status:"confirmed",date_precision:"date",start_date:null,end_date:null,event_date:null,start_at:null,end_at:null} as Job;
    expect(bookingAvailability(target,fulfilmentForItem(item("top","ART 932"),1),[item("top","ART 932")],[],[target])).toEqual({unknownDate:true,conflicts:[]});
  });
});
