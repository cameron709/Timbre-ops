"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackagePlus, Trash2 } from "lucide-react";
import { Pill } from "@/components/ui";
import { bookingAvailability, expandPackage, fulfilmentForItem } from "@/lib/inventory";
import { statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { GearItem, InventoryPackage, Job, JobBooking, PackageItem, PackItem } from "@/types/database";

export function ProjectEquipment({ jobId, onChanged }: { jobId: string; onChanged?: () => Promise<void> | void }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [packages, setPackages] = useState<InventoryPackage[]>([]);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [bookings, setBookings] = useState<JobBooking[]>([]);
  const [allPack, setAllPack] = useState<PackItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selection, setSelection] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [a, b, c, d, e, f] = await Promise.all([
      supabase.from("gear_items").select("*").eq("active", true).order("category").order("name"),
      supabase.from("packages").select("*").eq("active", true).order("name"),
      supabase.from("package_items").select("*"),
      supabase.from("job_bookings").select("*").eq("job_id", jobId).order("created_at"),
      supabase.from("pack_items").select("*"),
      supabase.from("jobs").select("*")
    ]);
    setGear(a.data ?? []);
    setPackages(b.data ?? []);
    setPackageItems(c.data ?? []);
    setBookings(d.data ?? []);
    setAllPack(e.data ?? []);
    setJobs(f.data ?? []);
  }, [jobId, supabase]);

  useEffect(() => { load(); }, [load]);

  const pack = allPack.filter((line) => line.job_id === jobId);
  const targetJob = jobs.find((job) => job.id === jobId);
  const selectionPreview = useMemo(() => {
    if (!selection) return { drafts: [], error: null as string | null };
    const [kind, selectedId] = selection.split(":");
    const count = Math.max(1, Number(quantity) || 1);
    const item = kind === "item" ? gear.find((entry) => entry.id === selectedId) : null;
    const packageRecord = kind === "package" ? packages.find((entry) => entry.id === selectedId) : null;
    try {
      return {
        drafts: item ? fulfilmentForItem(item, count) : packageRecord ? expandPackage(packageRecord.id, count, packages, packageItems, gear) : [],
        error: null as string | null
      };
    } catch (error) {
      return { drafts: [], error: error instanceof Error ? error.message : "Could not expand this package." };
    }
  }, [selection, quantity, gear, packages, packageItems]);
  const availability = useMemo(
    () => bookingAvailability(targetJob, selectionPreview.drafts, gear, allPack, jobs),
    [targetJob, selectionPreview.drafts, gear, allPack, jobs]
  );

  async function addBooking() {
    if (!selection) return;
    const [kind, selectedId] = selection.split(":");
    const bookingType: JobBooking["booking_type"] = kind === "package" ? "package" : "item";
    const count = Math.max(1, Number(quantity) || 1);
    const item = bookingType === "item" ? gear.find((entry) => entry.id === selectedId) : null;
    const packageRecord = bookingType === "package" ? packages.find((entry) => entry.id === selectedId) : null;
    if (!item && !packageRecord) return;
    if (selectionPreview.error) {
      setNotice(selectionPreview.error);
      return;
    }
    if (availability.unknownDate && selectionPreview.drafts.length) {
      if (!window.confirm("This project has no confirmed date, so stock conflicts with other projects cannot be checked. Book it anyway?")) return;
    }
    if (availability.conflicts.length) {
      const summary = availability.conflicts.map((conflict) => `${conflict.gearName}: short ${conflict.shortageAfter}`).join("\n");
      if (!window.confirm(`This booking over-allocates owned stock:\n\n${summary}\n\nBook it anyway?`)) return;
    }

    const inserted = await supabase.from("job_bookings").insert({
      job_id: jobId,
      booking_type: bookingType,
      gear_item_id: item?.id ?? null,
      package_id: packageRecord?.id ?? null,
      quantity: count,
      client_visible: true,
      source: "cameron"
    }).select().single();

    if (inserted.error || !inserted.data) {
      setNotice(inserted.error?.message ?? "Could not add booking.");
      return;
    }

    try {
      const drafts = selectionPreview.drafts;

      if (drafts.length) {
        const fulfilment = await supabase.from("pack_items").insert(drafts.map((draft) => ({
          ...draft,
          job_id: jobId,
          booking_id: inserted.data.id,
          package_id: packageRecord?.id ?? draft.package_id
        })));
        if (fulfilment.error) throw fulfilment.error;
      }
    } catch (error) {
      await supabase.from("pack_items").delete().eq("booking_id", inserted.data.id);
      await supabase.from("job_bookings").delete().eq("id", inserted.data.id);
      setNotice(error instanceof Error ? error.message : "Could not expand booking into fulfilment.");
      return;
    }

    setSelection("");
    setQuantity("1");
    setNotice(packageRecord ? `${packageRecord.name} booked and expanded into Fulfilment.` : `${item?.name} booked.`);
    await load();
    await onChanged?.();
  }

  async function removeBooking(booking: JobBooking) {
    const label = booking.booking_type === "package"
      ? packages.find((entry) => entry.id === booking.package_id)?.name
      : gear.find((entry) => entry.id === booking.gear_item_id)?.name;
    if (!window.confirm(`Remove ${label ?? "this booking"} from the project? Generated fulfilment lines will also be removed.`)) return;
    const packDelete = await supabase.from("pack_items").delete().eq("booking_id", booking.id);
    if (packDelete.error) {
      setNotice(packDelete.error.message);
      return;
    }
    const bookingDelete = await supabase.from("job_bookings").delete().eq("id", booking.id);
    setNotice(bookingDelete.error?.message ?? "Booking removed.");
    await load();
    await onChanged?.();
  }

  const generatedPack = pack.filter((line) => line.booking_id);
  const manualPack = pack.filter((line) => !line.booking_id);

  return (
    <section className="detail-section">
      <div className="section-head">
        <div>
          <h2>Equipment & services</h2>
          <p>Book catalogue items or packages here. Physical components flow automatically into Fulfilment.</p>
        </div>
        <Pill tone="quiet">{bookings.length} booking{bookings.length === 1 ? "" : "s"}</Pill>
      </div>

      <div className="kit-add">
        <select aria-label="Equipment or package" value={selection} onChange={(event) => setSelection(event.target.value)}>
          <option value="">Add equipment, service or package</option>
          <optgroup label="Packages">
            {packages.map((entry) => <option key={entry.id} value={`package:${entry.id}`}>{entry.name}</option>)}
          </optgroup>
          <optgroup label="Catalogue">
            {gear.map((entry) => <option key={entry.id} value={`item:${entry.id}`}>{entry.name} · {statusLabel(entry.item_type)}</option>)}
          </optgroup>
        </select>
        <input aria-label="Booking quantity" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        <button className="icon-text-button" onClick={addBooking} type="button"><PackagePlus size={17} /> Book</button>
      </div>

      {selection ? <div className="compact-list">
        {selectionPreview.error ? <article className="compact-row"><span><strong>Package problem</strong><small>{selectionPreview.error}</small></span><Pill tone="warn">Cannot book</Pill></article> : null}
        {!selectionPreview.error && availability.unknownDate && selectionPreview.drafts.length ? <article className="compact-row"><span><strong>Availability not verified</strong><small>Set the project date to check this booking against other jobs.</small></span><Pill tone="warn">Date needed</Pill></article> : null}
        {!selectionPreview.error && !availability.unknownDate && availability.conflicts.map((conflict) => <article className="compact-row" key={conflict.gearItemId}><span><strong>{conflict.gearName}</strong><small>Owned {conflict.quantityOwned} · already required {conflict.existingDemand} · this booking adds {conflict.requested} · {conflict.availableBefore} available before booking{conflict.conflictingProjects.length ? ` · also on ${conflict.conflictingProjects.join(", ")}` : ""}</small></span><Pill tone="warn">Short {conflict.shortageAfter}</Pill></article>)}
        {!selectionPreview.error && !availability.unknownDate && !availability.conflicts.length && selectionPreview.drafts.length ? <article className="compact-row"><span><strong>Stock check clear</strong><small>No owned-stock conflict detected for this project window.</small></span><Pill tone="good">Available</Pill></article> : null}
      </div> : null}

      <div className="compact-list">
        {bookings.map((booking) => {
          const item = gear.find((entry) => entry.id === booking.gear_item_id);
          const packageRecord = packages.find((entry) => entry.id === booking.package_id);
          const label = packageRecord?.name ?? item?.name ?? "Unknown booking";
          const fulfilmentLines = generatedPack.filter((line) => line.booking_id === booking.id);
          return (
            <article className="compact-row" key={booking.id}>
              <span>
                <strong>{booking.quantity} × {label}</strong>
                <small>{booking.booking_type === "package" ? `Package · ${fulfilmentLines.length} fulfilment line${fulfilmentLines.length === 1 ? "" : "s"}` : statusLabel(item?.item_type ?? "item")}</small>
              </span>
              <Pill tone={item?.item_type === "hire_in" ? "warn" : "neutral"}>{booking.booking_type === "package" ? "Package" : statusLabel(item?.tracking_mode ?? "non_stock")}</Pill>
              <button onClick={() => removeBooking(booking)} title={`Remove ${label}`} aria-label={`Remove ${label}`}><Trash2 size={16} /></button>
            </article>
          );
        })}
        {!bookings.length ? <p className="empty-inline">Nothing booked yet. Add a package, product, service, consumable or hire-in item above.</p> : null}
      </div>

      {manualPack.length ? <p className="meta">{manualPack.length} existing/manual fulfilment line{manualPack.length === 1 ? "" : "s"} remain intact and can still be managed in Fulfilment.</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
    </section>
  );
}
