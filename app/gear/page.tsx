"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, PackagePlus, Plus, Search } from "lucide-react";
import { EmptyState, Pill } from "@/components/ui";
import { allocationSummary } from "@/lib/gear";
import { formatJobSchedule, statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Asset, GearItem, InventoryItemType, InventoryPackage, InventoryTrackingMode, Job, PackageItem, PackItem } from "@/types/database";

const categories = ["audio", "power", "staging", "cabling", "playback", "lighting", "comms", "vision", "other"];
const itemTypes: InventoryItemType[] = ["product", "service", "consumable", "hire_in"];
const trackingModes: InventoryTrackingMode[] = ["pooled", "serialised", "non_stock"];

export default function GearPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [packages, setPackages] = useState<InventoryPackage[]>([]);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [pack, setPack] = useState<PackItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"catalogue" | "packages" | "allocations">("catalogue");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [newItem, setNewItem] = useState({ name: "", category: "audio", item_type: "product" as InventoryItemType, tracking_mode: "pooled" as InventoryTrackingMode, quantity_owned: "0", description: "" });
  const [newAsset, setNewAsset] = useState({ gear_item_id: "", asset_tag: "", serial_number: "" });
  const [newPackage, setNewPackage] = useState({ name: "", category: "audio", description: "", client_description: "" });
  const [componentDrafts, setComponentDrafts] = useState<Record<string, { component: string; quantity: string }>>({});

  const load = useCallback(async () => {
    const [a, b, c, d, e, g] = await Promise.all([
      supabase.from("gear_items").select("*").order("category").order("name"),
      supabase.from("assets").select("*").order("asset_tag"),
      supabase.from("packages").select("*").order("name"),
      supabase.from("package_items").select("*"),
      supabase.from("pack_items").select("*"),
      supabase.from("jobs").select("*").order("start_date", { ascending: true, nullsFirst: false })
    ]);
    setGear(a.data ?? []);
    setAssets(b.data ?? []);
    setPackages(c.data ?? []);
    setPackageItems(d.data ?? []);
    setPack(e.data ?? []);
    setJobs(g.data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const allocations = allocationSummary(gear, pack, jobs);
  const warnings = allocations.filter((item) => item.shortage > 0 || item.overlapWarning);
  const gearById = new Map(gear.map((item) => [item.id, item]));
  const packageById = new Map(packages.map((item) => [item.id, item]));

  const matches = (name: string, itemCategory: string) => (!search || name.toLowerCase().includes(search.toLowerCase())) && (category === "all" || itemCategory === category);
  const visibleGear = gear.filter(item => matches(item.name, item.category));
  const visiblePackages = packages.filter(item => matches(item.name, item.category));

  const visibleWarnings = warnings.filter(item => { const record = gearById.get(item.gearItemId); return record && matches(item.gearName, record.category); });

  async function addItem() {
    if (!newItem.name.trim()) return;
    const nonStock = newItem.item_type === "service" || newItem.item_type === "hire_in";
    const result = await supabase.from("gear_items").insert({
      name: newItem.name.trim(),
      category: newItem.category,
      item_type: newItem.item_type,
      tracking_mode: nonStock ? "non_stock" : newItem.tracking_mode,
      quantity_owned: nonStock ? 0 : Math.max(0, Number(newItem.quantity_owned) || 0),
      description: newItem.description.trim() || null
    });
    setNotice(result.error?.message ?? `${newItem.name.trim()} added to the catalogue.`);
    if (!result.error) setNewItem({ name: "", category: "audio", item_type: "product", tracking_mode: "pooled", quantity_owned: "0", description: "" });
    load();
  }

  async function updateItem(item: GearItem, patch: Partial<GearItem>) {
    const result = await supabase.from("gear_items").update(patch).eq("id", item.id);
    setNotice(result.error?.message ?? "Catalogue item updated.");
    load();
  }

  async function addAsset() {
    if (!newAsset.gear_item_id || !newAsset.asset_tag.trim()) return;
    const result = await supabase.from("assets").insert({
      gear_item_id: newAsset.gear_item_id,
      asset_tag: newAsset.asset_tag.trim(),
      serial_number: newAsset.serial_number.trim() || null
    });
    setNotice(result.error?.message ?? `${newAsset.asset_tag.trim()} added as an individual asset.`);
    if (!result.error) setNewAsset({ gear_item_id: "", asset_tag: "", serial_number: "" });
    load();
  }

  async function addPackage() {
    if (!newPackage.name.trim()) return;
    const result = await supabase.from("packages").insert({
      name: newPackage.name.trim(),
      category: newPackage.category,
      description: newPackage.description.trim() || null,
      client_description: newPackage.client_description.trim() || null
    });
    setNotice(result.error?.message ?? `${newPackage.name.trim()} package added.`);
    if (!result.error) setNewPackage({ name: "", category: "audio", description: "", client_description: "" });
    load();
  }

  async function addPackageComponent(packageRecord: InventoryPackage) {
    const draft = componentDrafts[packageRecord.id];
    if (!draft?.component) return;
    const [kind, id] = draft.component.split(":");
    if (kind === "package" && id === packageRecord.id) {
      setNotice("A package cannot contain itself. Even road cases have boundaries.");
      return;
    }
    const result = await supabase.from("package_items").insert({
      package_id: packageRecord.id,
      gear_item_id: kind === "item" ? id : null,
      child_package_id: kind === "package" ? id : null,
      quantity: Math.max(1, Number(draft.quantity) || 1)
    });
    setNotice(result.error?.message ?? "Package component added.");
    if (!result.error) setComponentDrafts({ ...componentDrafts, [packageRecord.id]: { component: "", quantity: "1" } });
    load();
  }

  return (
    <main className="page gear-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Gear</h1>
          <p>Catalogue, individual assets, packages and project demand.</p>
        </div>
        <Pill tone={warnings.length ? "warn" : "good"}>{warnings.length ? `${warnings.length} warnings` : "No shortages"}</Pill>
      </header>

      <div className="gear-toolbar">
        <div className="search-field"><Search size={18} aria-hidden="true"/><input aria-label="Search inventory" placeholder="Search catalogue or packages" value={search} onChange={event => setSearch(event.target.value)}/></div>
        <nav className="detail-tabs" aria-label="Inventory views">{(["catalogue", "packages", "allocations"] as const).map(view => <button type="button" key={view} aria-pressed={tab === view} className={tab === view ? "active" : ""} onClick={() => setTab(view)}>{statusLabel(view)}{view === "allocations" && warnings.length ? ` · ${warnings.length}` : ""}</button>)}</nav>
        <div className="filter-row scroll" role="group" aria-label="Inventory categories">{["all", ...categories].map(item => <button type="button" key={item} aria-pressed={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{statusLabel(item)}</button>)}</div>
        <div className="gear-summary"><span><strong>{gear.length}</strong> catalogue lines</span><span><strong>{assets.length}</strong> individual assets</span><span><strong>{packages.length}</strong> packages</span></div>
      </div>

      <details className="gear-scope"><summary>About inventory tracking</summary><p>Track pooled products or individual serialised assets. Services and hire-in lines are non-stock bookings. Packages expand into project fulfilment.</p></details>

      <section className="detail-layout" hidden={tab !== "catalogue"}>
        <div className="detail-section">
          <div className="section-head"><div><h2>Catalogue</h2><p>Products, services, consumables and hire-in lines.</p></div></div>
          <details className="gear-creation"><summary>Add catalogue item</summary>
          <div className="form-grid two">
            <label>Name<input value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} placeholder="QSC LS118" /></label>
            <label>Type<select value={newItem.item_type} onChange={(event) => setNewItem({ ...newItem, item_type: event.target.value as InventoryItemType })}>{itemTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}</select></label>
            <label>Category<select value={newItem.category} onChange={(event) => setNewItem({ ...newItem, category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{statusLabel(category)}</option>)}</select></label>
            <label>Tracking<select disabled={newItem.item_type === "service" || newItem.item_type === "hire_in"} value={newItem.item_type === "service" || newItem.item_type === "hire_in" ? "non_stock" : newItem.tracking_mode} onChange={(event) => setNewItem({ ...newItem, tracking_mode: event.target.value as InventoryTrackingMode })}>{trackingModes.map((mode) => <option key={mode} value={mode}>{statusLabel(mode)}</option>)}</select></label>
            <label>Owned<input disabled={newItem.item_type === "service" || newItem.item_type === "hire_in"} inputMode="numeric" value={newItem.quantity_owned} onChange={(event) => setNewItem({ ...newItem, quantity_owned: event.target.value })} /></label>
            <label>Description<input value={newItem.description} onChange={(event) => setNewItem({ ...newItem, description: event.target.value })} placeholder="Useful operational detail" /></label>
          </div>
          <button className="icon-text-button" onClick={addItem} type="button"><PackagePlus size={17} /> Add catalogue item</button>
          </details>
          <div className="catalogue-list">
            {visibleGear.map((item) => {
              const allocation = allocations.find((entry) => entry.gearItemId === item.id);
              return (
                <article className="catalogue-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{statusLabel(item.item_type)} · {statusLabel(item.category)} · {statusLabel(item.tracking_mode)}</small>
                    {item.item_type === "product" || item.item_type === "consumable" ? <span className="stock-figures"><span>Owned <b>{item.quantity_owned}</b></span><span>Planned <b>{allocation?.planned ?? 0}</b></span><span>Unallocated <b>{Math.max(0, item.quantity_owned - (allocation?.planned ?? 0))}</b></span></span> : <small>Non-stock booking item</small>}
                    {item.description ? <small>{item.description}</small> : null}
                  </div>
                  {item.item_type === "product" || item.item_type === "consumable" ? <label className="quantity-edit">Owned<input aria-label={`${item.name} quantity owned`} inputMode="numeric" value={item.quantity_owned} onChange={(event) => updateItem(item, { quantity_owned: Math.max(0, Number(event.target.value) || 0) })} /></label> : null}
                  {allocation?.shortage ? <Pill tone="warn">Short {allocation.shortage}</Pill> : <Pill tone="quiet">{item.active ? "Active" : "Archived"}</Pill>}
                </article>
              );
            })}
            {!visibleGear.length ? <EmptyState icon={Boxes} title={gear.length ? "No matching gear" : "No catalogue items yet"} body={gear.length ? "Try another search or category." : "Add owned stock, services, consumables and hire-in options."} /> : null}
          </div>
        </div>

        <div className="detail-section">
          <div className="section-head"><div><h2>Individual assets</h2><p>Serialised physical units for barcode, service and test history.</p></div></div>
          <details className="gear-creation"><summary>Register an individual asset</summary>
          <div className="form-grid">
            <label>Catalogue item<select value={newAsset.gear_item_id} onChange={(event) => setNewAsset({ ...newAsset, gear_item_id: event.target.value })}><option value="">Choose serialised product</option>{gear.filter((item) => item.item_type === "product" && item.tracking_mode === "serialised").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Asset tag<input value={newAsset.asset_tag} onChange={(event) => setNewAsset({ ...newAsset, asset_tag: event.target.value })} placeholder="LS118-01" /></label>
            <label>Serial number<input value={newAsset.serial_number} onChange={(event) => setNewAsset({ ...newAsset, serial_number: event.target.value })} /></label>
          </div>
          <button className="icon-text-button" onClick={addAsset} type="button"><Plus size={17} /> Add asset</button>
          </details>
          <div className="catalogue-list">
            {assets.filter(asset => { const item = gearById.get(asset.gear_item_id); return item && matches(`${asset.asset_tag} ${asset.serial_number ?? ""} ${item.name}`, item.category); }).map((asset) => <article className="catalogue-row" key={asset.id}><div><strong>{asset.asset_tag} · {gearById.get(asset.gear_item_id)?.name ?? "Unknown item"}</strong><small>{asset.serial_number ? `S/N ${asset.serial_number} · ` : ""}{statusLabel(asset.status)} · {statusLabel(asset.condition)}</small></div><Pill tone={asset.status === "available" ? "good" : "warn"}>{statusLabel(asset.status)}</Pill></article>)}
            {!assets.length ? <p className="empty-inline">No individual assets yet. Mark a product as serialised, then add its physical units here.</p> : null}
          </div>
        </div>
      </section>

      <section className="detail-section" hidden={tab !== "packages"}>
        <div className="section-head"><div><h2>Packages</h2><p>Reusable bookings that can contain items, services, consumables, hire-in lines or other packages.</p></div></div>
        <details className="gear-creation"><summary>Create package</summary>
        <div className="form-grid two">
          <label>Name<input value={newPackage.name} onChange={(event) => setNewPackage({ ...newPackage, name: event.target.value })} placeholder="Small Band PA" /></label>
          <label>Category<select value={newPackage.category} onChange={(event) => setNewPackage({ ...newPackage, category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{statusLabel(category)}</option>)}</select></label>
          <label>Description<input value={newPackage.description} onChange={(event) => setNewPackage({ ...newPackage, description: event.target.value })} /></label>
          <label>Client description<input value={newPackage.client_description} onChange={(event) => setNewPackage({ ...newPackage, client_description: event.target.value })} placeholder="Professional PA package" /></label>
        </div>
        <button className="icon-text-button" onClick={addPackage} type="button"><Plus size={17} /> Add package</button>
        </details>
        <div className="catalogue-list">
          {visiblePackages.map((packageRecord) => {
            const components = packageItems.filter((item) => item.package_id === packageRecord.id);
            return (
              <article className="catalogue-row kit-row" key={packageRecord.id}>
                <div>
                  <strong>{packageRecord.name}</strong>
                  <small>{packageRecord.client_description ?? packageRecord.description ?? "No description"}</small>
                  <small>{components.length ? components.map((component) => {
                    const label = component.gear_item_id ? gearById.get(component.gear_item_id)?.name : packageById.get(component.child_package_id ?? "")?.name;
                    return `${component.quantity} × ${label ?? "Unknown component"}`;
                  }).join(", ") : "No components yet"}</small>
                </div>
                <div className="kit-component-controls">
                  <select aria-label={`Component for ${packageRecord.name}`} value={componentDrafts[packageRecord.id]?.component ?? ""} onChange={(event) => setComponentDrafts({ ...componentDrafts, [packageRecord.id]: { component: event.target.value, quantity: componentDrafts[packageRecord.id]?.quantity ?? "1" } })}>
                    <option value="">Component</option>
                    <optgroup label="Catalogue">{gear.filter((item) => item.active).map((item) => <option key={item.id} value={`item:${item.id}`}>{item.name} · {statusLabel(item.item_type)}</option>)}</optgroup>
                    <optgroup label="Packages">{packages.filter((item) => item.id !== packageRecord.id && item.active).map((item) => <option key={item.id} value={`package:${item.id}`}>{item.name}</option>)}</optgroup>
                  </select>
                  <input aria-label={`Quantity for ${packageRecord.name}`} inputMode="numeric" value={componentDrafts[packageRecord.id]?.quantity ?? "1"} onChange={(event) => setComponentDrafts({ ...componentDrafts, [packageRecord.id]: { component: componentDrafts[packageRecord.id]?.component ?? "", quantity: event.target.value } })} />
                  <button className="secondary-button" onClick={() => addPackageComponent(packageRecord)} type="button">Add</button>
                </div>
              </article>
            );
          })}
          {!visiblePackages.length ? <EmptyState icon={Boxes} title={packages.length ? "No matching packages" : "No packages yet"} body="Change your filters or create a reusable production package." /> : null}
        </div>
      </section>

      <div className="gear-workspace" hidden={tab !== "allocations"}><section className="detail-section allocation-inspector">
        <h2>Allocation warnings</h2>
        {visibleWarnings.length ? visibleWarnings.map((item) => (
          <article className="allocation-row" key={item.gearItemId}>
            <AlertTriangle size={18} />
            <span><strong>{item.gearName}</strong><small>Owned {item.quantityOwned}; planned {item.planned}; packed {item.packed}; out {item.out}; returned {item.returned}</small><small>{item.requestedBy.join(", ")}</small></span>
            <Pill tone="warn">{item.shortage > 0 ? `Short ${item.shortage}` : "Check overlap"}</Pill>
          </article>
        )) : <p className="empty-inline">{warnings.length ? "No warnings match these filters." : "No catalogue shortages in the current fulfilment data."}</p>}
      </section>

      <section className="detail-section">
        <h2>Recent project demand</h2>
        <div className="catalogue-list">
          {jobs.filter((job) => pack.some((item) => item.job_id === job.id)).slice(0, 8).map((job) => (
            <article className="catalogue-row" key={job.id}><div><strong>{job.title}</strong><small>{formatJobSchedule(job)}</small></div><Pill tone="quiet">{pack.filter((item) => item.job_id === job.id).length} lines</Pill></article>
          ))}
        </div>
      </section>

      </div>
      {notice ? <p className="notice" role="status">{notice}</p> : null}
    </main>
  );
}
