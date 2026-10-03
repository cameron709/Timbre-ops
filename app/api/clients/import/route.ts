import { NextResponse } from "next/server";
import { createRequestClient } from "@/lib/supabase/server";

type ImportRow = {
  organisation?: unknown;
  contact_name?: unknown;
  email?: unknown;
  client_type?: unknown;
  client_status?: unknown;
  relationship_notes?: unknown;
};

const validTypes = new Set(["Organisation","Local Government","School","Festival","Arts Organisation","Church","AV / Production Company","Private Client","Wedding Client","Other"]);
const validStatuses = new Set(["Active","Prospect","Inactive"]);

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false, message: "Sign in again to continue." }, { status: 401 });
  const supabase = createRequestClient(token);
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData.user) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });

  const body = await request.json().catch(() => null) as { rows?: ImportRow[]; notes?: unknown } | null;
  if (!Array.isArray(body?.rows) || body.rows.length === 0 || body.rows.length > 500) {
    return NextResponse.json({ ok: false, message: "Send 1 to 500 client rows." }, { status: 400 });
  }

  const batch = await supabase.from("client_import_batches").insert({ notes: text(body.notes), created_by: userData.user.id }).select().single();
  if (batch.error) throw batch.error;

  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const raw of body.rows) {
    const email = normalizeEmail(text(raw.email));
    const organisation = text(raw.organisation) || organisationFromEmail(email) || text(raw.contact_name) || "Private client";
    const contactName = text(raw.contact_name) || email || organisation;
    const clientType = validTypes.has(text(raw.client_type) ?? "") ? text(raw.client_type)! : "Organisation";
    const clientStatus = validStatuses.has(text(raw.client_status) ?? "") ? text(raw.client_status)! : "Prospect";
    const notes = text(raw.relationship_notes);

    const audit = await supabase.from("client_import_rows").insert({
      batch_id: batch.data.id,
      organisation,
      contact_name: contactName,
      email,
      client_type: clientType,
      client_status: clientStatus,
      relationship_notes: notes
    }).select().single();
    if (audit.error) {
      errors.push(audit.error.message);
      skipped += 1;
      continue;
    }

    const existingContact = email ? await supabase.from("contacts").select("id,client_id").eq("email", email).maybeSingle() : { data: null, error: null };
    if (existingContact.error) {
      errors.push(existingContact.error.message);
      skipped += 1;
      continue;
    }

    let clientId = existingContact.data?.client_id;
    if (!clientId) {
      const existingClient = await supabase.from("clients").select("id,notes").ilike("name", organisation).maybeSingle();
      if (existingClient.error) {
        errors.push(existingClient.error.message);
        skipped += 1;
        continue;
      }
      if (existingClient.data) {
        clientId = existingClient.data.id;
        if (notes && !existingClient.data.notes?.includes(notes)) await supabase.from("clients").update({ notes: [existingClient.data.notes, notes].filter(Boolean).join("\n\n") }).eq("id", clientId);
      } else {
        const created = await supabase.from("clients").insert({ name: organisation, type: clientType, status: clientStatus, email, domain: domainFromEmail(email), notes } as never).select().single();
        if (created.error) {
          errors.push(created.error.message);
          skipped += 1;
          continue;
        }
        clientId = created.data.id;
      }
    }

    let contactId = existingContact.data?.id;
    if (!contactId) {
      const createdContact = await supabase.from("contacts").insert({ client_id: clientId, display_name: contactName, email, is_primary: true, notes }).select().single();
      if (createdContact.error) {
        errors.push(createdContact.error.message);
        skipped += 1;
        continue;
      }
      contactId = createdContact.data.id;
    }

    await supabase.from("client_import_rows").update({ import_status: "imported", matched_client_id: clientId, matched_contact_id: contactId }).eq("id", audit.data.id);
    imported += 1;
  }

  return NextResponse.json({ ok: errors.length === 0, message: `Imported ${imported} row${imported === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.`, imported, skipped, errors: errors.slice(0, 10) });
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEmail(value: string | null) {
  return value?.toLowerCase() ?? null;
}

function domainFromEmail(value: string | null) {
  return value?.split("@")[1] ?? null;
}

function organisationFromEmail(value: string | null) {
  const domain = domainFromEmail(value);
  if (!domain || ["gmail.com", "outlook.com", "hotmail.com", "icloud.com", "yahoo.com"].includes(domain)) return null;
  return domain.split(".").slice(0, -1).join(" ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
