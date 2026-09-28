import { describe,expect,it } from "vitest";
import { classifyDebriefLine,findMemories } from "@/lib/memory";
import type { JobMemory } from "@/types/database";
describe("debrief memory",()=>{
  it("retrieves lessons by summary, detail, classification and tags",()=>{const memories=[{summary:"Move FOH further back",detail:"Coverage was uneven",category:"technical_lesson",tags:["mad-hatters"]},{summary:"Buy cable ramps",detail:null,category:"purchase_idea",tags:[]}] as JobMemory[];expect(findMemories(memories,"FOH coverage")).toHaveLength(1);expect(findMemories(memories,"cable")[0].summary).toBe("Buy cable ramps");});
  it("classifies deterministic debrief cues",()=>{expect(classifyDebriefLine("The amplifier was broken")).toBe("equipment_issue");expect(classifyDebriefLine("Buy more cable ramps")).toBe("purchase_idea");});
});
