import { NextResponse } from "next/server";
import { authorisedClient } from "@/lib/email/auth";
import { extractAttachmentText } from "@/lib/email/attachment-text";
import { classifyDocument } from "@/lib/email/extraction";
import { buildGmailSearch, normalizeGmailThread, proposalsForNormalizedThread, type GmailThread } from "@/lib/email/gmail-import";
import { gmailAccessToken, gmailFetch } from "@/lib/email/google";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await authorisedClient(request);
    const [{ data: job, error }, { data: clients }, { data: contacts }] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", id).single(),
      supabase.from("clients").select("*"),
      supabase.from("contacts").select("*")
    ]);
    if (error || !job) throw new Error("Job not found.");

    const client = clients?.find((item) => item.id === job.client_id);
    const clientContacts = contacts?.filter((item) => item.client_id === job.client_id) ?? [];
    const matchJob = {
      title: job.title,
      venue: job.venue,
      startDate: job.start_date ?? job.start_at,
      clientName: client?.name,
      contactEmails: [job.contact_email, client?.email, ...clientContacts.map((contact) => contact.email)].filter(Boolean) as string[]
    };

    const { token } = await gmailAccessToken(supabase);
    const query = buildGmailSearch(matchJob);
    const list = await gmailFetch<{ messages?: Array<{ id: string; threadId: string }> }>(token, `/messages?maxResults=50&q=${encodeURIComponent(query)}`);
    const threadIds = [...new Set((list.messages ?? []).map((item) => item.threadId))].slice(0, 25);
    const threads = await Promise.all(threadIds.map((threadId) => gmailFetch<GmailThread>(token, `/threads/${threadId}?format=full`)));
    const normalized = threads.map((thread) => normalizeGmailThread(thread, matchJob)).filter((thread) => thread.match.eligible);

    let proposals = 0;
    for (const thread of normalized) {
      const { data: storedThread, error: threadError } = await supabase.from("email_threads").upsert({
        gmail_thread_id: thread.id,
        subject: thread.subject,
        participants: thread.participants,
        snippet: thread.snippet,
        latest_message_at: thread.latestMessageAt,
        gmail_url: thread.gmailUrl,
        last_synced_at: new Date().toISOString()
      }, { onConflict: "gmail_thread_id" }).select().single();
      if (threadError) throw threadError;

      await supabase.from("job_email_threads").upsert({
        job_id: id,
        email_thread_id: storedThread.id,
        match_score: thread.match.score,
        match_reasons: thread.match.reasons
      }, { onConflict: "job_id,email_thread_id" });

      const messageIds = new Map<string, string>();
      const attachmentIds = new Map<string, string>();

      for (const message of thread.messages) {
        const fromEmail = emailAddress(message.from);
        const matchedContact = fromEmail ? clientContacts.find((contact) => contact.email?.toLowerCase() === fromEmail) : undefined;
        const { data: storedMessage, error: messageError } = await supabase.from("email_messages").upsert({
          email_thread_id: storedThread.id,
          gmail_message_id: message.id,
          sent_at: message.sentAt,
          from_address: message.from,
          to_addresses: message.to,
          subject: message.subject,
          snippet: message.snippet,
          body_text: message.body,
          gmail_url: `https://mail.google.com/mail/u/0/#all/${message.id}`,
          content_hash: message.hash
        }, { onConflict: "gmail_message_id" }).select().single();
        if (messageError) throw messageError;

        messageIds.set(message.id, storedMessage.id);
        if (job.client_id) {
          await supabase.from("crm_activities").upsert({
            activity_type: "Email",
            client_id: job.client_id,
            contact_id: matchedContact?.id ?? job.primary_contact_id ?? null,
            job_id: id,
            direction: matchedContact ? "inbound" : "internal",
            subject: message.subject || thread.subject || "(no subject)",
            summary: message.snippet,
            body: message.body,
            source: "gmail",
            external_id: message.id,
            occurred_at: message.sentAt
          }, { onConflict: "source,external_id" });
        }

        for (const attachment of message.attachments) {
          if (attachment.gmailAttachmentId && (/pdf|wordprocessingml|text\//i.test(attachment.mimeType ?? "") || /\.(pdf|docx|txt)$/i.test(attachment.filename))) {
            try {
              const download = await gmailFetch<{ data: string }>(token, `/messages/${message.id}/attachments/${attachment.gmailAttachmentId}`);
              const bytes = Buffer.from(download.data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
              attachment.extractedText = await extractAttachmentText(bytes, attachment.mimeType, attachment.filename);
            } catch (extractionError) {
              attachment.extractionError = extractionError instanceof Error ? extractionError.message : "Attachment text extraction failed.";
            }
          }
          const { data: storedAttachment, error: attachmentError } = await supabase.from("email_attachments").upsert({
            email_message_id: storedMessage.id,
            gmail_attachment_id: attachment.gmailAttachmentId,
            filename: attachment.filename,
            mime_type: attachment.mimeType,
            size_bytes: attachment.sizeBytes,
            document_type: classifyDocument(attachment.filename),
            source_date: message.sentAt,
            last_error: attachment.extractionError ?? null
          }, { onConflict: "email_message_id,filename" }).select().single();
          if (attachmentError) throw attachmentError;
          attachmentIds.set(`${message.id}:${attachment.gmailAttachmentId ?? attachment.filename}`, storedAttachment.id);
        }
      }

      for (const item of proposalsForNormalizedThread(thread)) {
        const messageId = messageIds.get(item.sourceMessageId) ?? null;
        const emailAttachmentId = item.sourceAttachmentId ? attachmentIds.get(`${item.sourceMessageId}:${item.sourceAttachmentId}`) ?? null : null;
        const { error: proposalError } = await supabase.from("import_proposals").upsert({
          job_id: id,
          email_thread_id: storedThread.id,
          email_message_id: messageId,
          email_attachment_id: emailAttachmentId,
          field_key: item.fieldKey,
          proposed_value: item.value as never,
          proposed_text: item.text,
          confidence: item.confidence,
          source_excerpt: item.excerpt,
          source_date: item.sourceDate,
          conflict_group: item.conflictGroup ?? null,
          idempotency_key: item.idempotencyKey
        }, { onConflict: "idempotency_key", ignoreDuplicates: true });
        if (proposalError) throw proposalError;
        proposals++;
      }
    }

    const now = new Date().toISOString();
    await Promise.all([
      supabase.from("integration_connections").upsert({ provider: "gmail", status: "connected", last_synced_at: now, last_error: null, metadata: { authenticated: true, retrieval: true, sync: true } }),
      supabase.from("sync_runs").insert({ provider: "gmail", status: "succeeded", finished_at: now, records_seen: threads.length, records_changed: normalized.length, metadata: { job_id: id, query } })
    ]);
    return NextResponse.json({ ok: true, candidates: normalized.length, proposals });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gmail sync failed." }, { status: 400 });
  }
}

function emailAddress(value: string | null) {
  return value?.match(/[\w.+-]+@[\w.-]+/)?.[0]?.toLowerCase() ?? null;
}
