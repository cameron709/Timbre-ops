import { describe,expect,it } from "vitest";
import { operationMutation,packQuantityMutation } from "@/lib/assistant/mutations";
import { parseAssistantCommand } from "@/lib/assistant/parser";
describe("assistant mutation plans",()=>{
  it("increments rather than replaces a pack quantity",()=>{expect(packQuantityMutation(6,1)).toEqual({before:6,after:7,patch:{quantity_planned:7}});});
  it("creates a date-only Beth deadline",()=>{const intent=parseAssistantCommand("Beth needs to order a marquee by Wednesday",new Date("2026-09-28T04:00:00Z"));if(intent.type!=="upsert_operation")throw new Error("wrong intent");expect(operationMutation(intent)).toMatchObject({owner:"Beth",due_at:null,due_date:"2026-09-30",due_precision:"date",status:"open"});});
});
