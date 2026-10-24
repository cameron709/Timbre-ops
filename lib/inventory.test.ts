import { describe, expect, it } from "vitest";
import { expandPackage, fulfilmentForItem } from "@/lib/inventory";
import type { GearItem, InventoryPackage, PackageItem } from "@/types/database";

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
