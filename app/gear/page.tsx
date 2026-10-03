"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, PackagePlus, Plus } from "lucide-react";
import { EmptyState, Pill } from "@/components/ui";
import { allocationSummary } from "@/lib/gear";
import { formatJobSchedule, statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { GearItem, GearKit, GearKitItem, Job, PackItem } from "@/types/database";

const categories = ["audio", "power", "staging", "cabling", "playback", "lighting", "comms", "other"];

export default function GearPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [kits, setKits] = useState<GearKit[]>([]);
  const [kitItems, setKitItems] = useState<GearKitItem[]>([]);
  const [pack, setPack] = useState<PackItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notice, setNotice] = useState("");
  const [newItem, setNewItem] = useState({ name: "", category: "audio", quantity_owned: "0", description: "" });
  const [newKit, setNewKit] = useState({ name: "", description: "" });
  const [componentDrafts, setComponentDrafts] = useState<Record<string, { gear_item_id: string; quantity: string }>>({});

  const load = useCallback(async () => {
    const [a, b, c, d, e] = await Promise.all([
      supabase.from("gear_items").select("*").order("category").order("name"),
      supabase.from("gear_kits").select("*").order("name"),
      supabase.from("gear_kit_items").select("*"),
      supabase.from("pack_items").select("*"),
      supabase.from("jobs").select("*").order("start_date", { ascending: true, nullsFirst: false })
    ]);
    setGear(a.data ?? []);
    setKits(b.data ?? []);
    setKitItems(c.data ?? []);
    setPack(d.data ?? []);
    setJobs(e.data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const allocations = allocationSummary(gear, pack, jobs);
  const warnings = allocations.filter((item) => item.shortage > 0 || item.overlapWarning);
  const gearById = new Map(gear.map((item) => [item.id, item]));

  async function addItem() {
    if (!newItem.name.trim()) return;
    const result = await supabase.from("gear_items").insert({
      name: newItem.name.trim(),
      category: newItem.category,
      quantity_owned: Math.max(0, Number(newItem.quantity_owned) || 0),
      description: newItem.description.trim() || null
    });
    setNotice(result.error?.message ?? `${newItem.name.trim()} added to the catalogue.`);
    if (!result.error) setNewItem({ name: "", category: "audio", quantity_owned: "0", description: "" });
    load();
  }

  async function updateItem(item: GearItem, patch: Partial<GearItem>) {
    const result = await supabase.from("gear_items").update(patch).eq("id", item.id);
    setNotice(result.error?.message ?? "Catalogue item updated.");
    load();
  }

  async function addKit() {
    if (!newKit.name.trim()) return;
    const result = await supabase.from("gear_kits").insert({ name: newKit.name.trim(), description: newKit.description.trim() || null });
    setNotice(result.error?.message ?? `${newKit.name.trim()} kit added.`);
    if (!result.error) setNewKit({ name: "", description: "" });
    load();
  }

  async function addKitComponent(kit: GearKit) {
    const draft = componentDrafts[kit.id];
    if (!draft?.gear_item_id) return;
    const result = await supabase.from("gear_kit_items").upsert({
      kit_id: kit.id,
      gear_item_id: draft.gear_item_id,
      quantity: Math.max(1, Number(draft.quantity) || 1)
    }, { onConflict: "kit_id,gear_item_id" });
    setNotice(result.error?.message ?? "Kit component saved.");
    if (!result.error) setComponentDrafts({ ...componentDrafts, [kit.id]: { gear_item_id: "", quantity: "1" } });
    load();
  }

  return (
    <main className="page gear-page">
      <header className="page-head">
        <div>
          <h1>Gear</h1>
          <p>Catalogue-backed pack planning with provisional stock warnings.</p>
        </div>
        <Pill tone={warnings.length ? "warn" : "good"}>{warnings.length ? `${warnings.length} warnings` : "No shortages"}</Pill>
      </header>

      <section className="review-panel gear-scope">
        <AlertTriangle size={19} />
        <div>
          <h2>What this can guarantee</h2>
          <p>It compares job planned quantities with catalogue quantities and highlights shortages or overlapping demand. Availability remains provisional until every owned item and every job allocation is entered.</p>
          <p>Deferred: barcode scanning, individual asset history, test-and-tag records, maintenance, purchase pricing and automatic reservations.</p>
        </div>
      </section>

      <section className="detail-layout">
        <div className="detail-section">
          <div className="section-head">
            <div>
              <h2>Catalogue</h2>
              <p>Owned stock and reusable gear Cameron can match to pack lines.</p>
            </div>
          </div>
          <div className="form-grid two">
            <label>Name<input value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} placeholder="DI Box" /></label>
            <label>Category<select value={newItem.category} onChange={(event) => setNewItem({ ...newItem, category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{statusLabel(category)}</option>)}</select></label>
            <label>Owned<input inputMode="numeric" value={newItem.quantity_owned} onChange={(event) => setNewItem({ ...newItem, quantity_owned: event.target.value })} /></label>
            <label>Description<input value={newItem.description} onChange={(event) => setNewItem({ ...newItem, description: event.target.value })} placeholder="Useful details, not serial tracking" /></label>
          </div>
          <button className="icon-text-button" onClick={addItem} type="button"><PackagePlus size={17} /> Add catalogue item</button>
          <div className="catalogue-list">
            {gear.map((item) => {
              const allocation = allocations.find((allocationItem) => allocationItem.gearItemId === item.id);
              return (
                <article className="catalogue-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{statusLabel(item.category)} · owned {item.quantity_owned} · planned {allocation?.planned ?? 0}</small>
                    {item.description ? <small>{item.description}</small> : null}
                  </div>
                  <input aria-label={`${item.name} quantity owned`} inputMode="numeric" value={item.quantity_owned} onChange={(event) => updateItem(item, { quantity_owned: Math.max(0, Number(event.target.value) || 0) })} />
                  {allocation?.shortage ? <Pill tone="warn">Short {allocation.shortage}</Pill> : <Pill tone="quiet">OK</Pill>}
                </article>
              );
            })}
            {!gear.length ? <EmptyState icon={Boxes} title="No catalogue items yet" body="Add practical stock first: DI boxes, stands, microphones, cabling and playback." /> : null}
          </div>
        </div>

        <div className="detail-section">
          <div className="section-head">
            <div>
              <h2>Kits and packages</h2>
              <p>Reusable groups that can expand into editable job pack lines.</p>
            </div>
          </div>
          <div className="form-grid">
            <label>Kit name<input value={newKit.name} onChange={(event) => setNewKit({ ...newKit, name: event.target.value })} placeholder="Small PA package" /></label>
            <label>Description<input value={newKit.description} onChange={(event) => setNewKit({ ...newKit, description: event.target.value })} /></label>
          </div>
          <button className="icon-text-button" onClick={addKit} type="button"><Plus size={17} /> Add kit shell</button>
          <div className="catalogue-list">
            {kits.map((kit) => {
              const components = kitItems.filter((item) => item.kit_id === kit.id);
              return (
                <article className="catalogue-row kit-row" key={kit.id}>
                  <div>
                    <strong>{kit.name}</strong>
                    <small>{kit.description ?? "No description"}</small>
                    <small>{components.length ? components.map((component) => `${component.quantity} x ${gearById.get(component.gear_item_id)?.name ?? "Unknown item"}`).join(", ") : "No components yet"}</small>
                  </div>
                  <div className="kit-component-controls">
                    <select aria-label={`Component for ${kit.name}`} value={componentDrafts[kit.id]?.gear_item_id ?? ""} onChange={(event) => setComponentDrafts({ ...componentDrafts, [kit.id]: { gear_item_id: event.target.value, quantity: componentDrafts[kit.id]?.quantity ?? "1" } })}>
                      <option value="">Component</option>
                      {gear.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <input aria-label={`Quantity for ${kit.name}`} inputMode="numeric" value={componentDrafts[kit.id]?.quantity ?? "1"} onChange={(event) => setComponentDrafts({ ...componentDrafts, [kit.id]: { gear_item_id: componentDrafts[kit.id]?.gear_item_id ?? "", quantity: event.target.value } })} />
                    <button className="secondary-button" onClick={() => addKitComponent(kit)} type="button">Add</button>
                  </div>
                </article>
              );
            })}
            {!kits.length ? <EmptyState icon={Boxes} title="No kits yet" body="Create kit shells and add catalogue components to reuse common packages." /> : null}
          </div>
        </div>
      </section>

      <section className="detail-section">
        <h2>Allocation warnings</h2>
        {warnings.length ? warnings.map((item) => (
          <article className="allocation-row" key={item.gearItemId}>
            <AlertTriangle size={18} />
            <span>
              <strong>{item.gearName}</strong>
              <small>Owned {item.quantityOwned}; planned {item.planned}; packed {item.packed}; out {item.out}; returned {item.returned}</small>
              <small>{item.requestedBy.join(", ")}{item.overlapWarning ? " · overlapping demand is provisional" : ""}</small>
            </span>
            <Pill tone="warn">Short {item.shortage}</Pill>
          </article>
        )) : <p className="empty-inline">No catalogue shortages in the current pack data.</p>}
      </section>

      <section className="detail-section">
        <h2>Recent job demand</h2>
        <div className="catalogue-list">
          {jobs.filter((job) => pack.some((item) => item.job_id === job.id)).slice(0, 8).map((job) => (
            <article className="catalogue-row" key={job.id}>
              <div>
                <strong>{job.title}</strong>
                <small>{formatJobSchedule(job)}</small>
              </div>
              <Pill tone="quiet">{pack.filter((item) => item.job_id === job.id).length} lines</Pill>
            </article>
          ))}
        </div>
      </section>

      {notice ? <p className="notice">{notice}</p> : null}
    </main>
  );
}
