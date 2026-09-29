export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type JobStatus =
  | "enquiry"
  | "assessing"
  | "site_discovery"
  | "quoting"
  | "quote_sent"
  | "confirmed"
  | "planning"
  | "ready_to_pack"
  | "packed"
  | "on_site"
  | "complete"
  | "debriefed"
  | "invoiced"
  | "closed"
  | "cancelled";

export type OperationStatus = "open" | "waiting" | "done" | "cancelled";
export type PackState = "planned" | "packed" | "out" | "returned";
export type SourceKind = "client" | "cameron" | "beth" | "email" | "calendar" | "ai_inference" | "system";

export type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  title: string;
  client_id: string | null;
  venue: string | null;
  start_at: string | null;
  end_at: string | null;
  date_precision: "date" | "timed";
  start_date: string | null;
  end_date: string | null;
  status: JobStatus;
  brief: string | null;
  intent: string | null;
  google_calendar_event_id: string | null;
  source_email_thread_id: string | null;
  precedent_job_id: string | null;
  readiness: number;
  contact_name: string | null;
  contact_email: string | null;
  arrival_at: string | null;
  bump_in_at: string | null;
  soundcheck_at: string | null;
  setup_at: string | null;
  bump_out_at: string | null;
  programme_notes: string | null;
  technical_notes: string | null;
  status_override_reason: string | null;
  status_override_at: string | null;
  status_override_by: string | null;
  site_notes: Json;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Operation = {
  id: string;
  title: string;
  owner: "Cameron" | "Beth" | null;
  due_at: string | null;
  due_date: string | null;
  due_precision: "none" | "date" | "timed";
  status: OperationStatus;
  notes: string | null;
  job_id: string | null;
  source: SourceKind;
  created_at: string;
  updated_at: string;
};

export type JobChange = {
  id: string;
  job_id: string;
  summary: string;
  detail: string | null;
  source: SourceKind;
  source_ref: string | null;
  requires_attention: boolean;
  resolved_at: string | null;
  resolution: string | null;
  resolved_by: string | null;
  created_at: string;
};

export type JobRequirement = {
  id: string; job_id: string; key: string; label: string; category: string;
  applicable: boolean; resolved: boolean; detail: string | null; source: SourceKind;
  created_at: string; updated_at: string;
  source_ref: string | null;
};

export type JobDocument = {
  id: string; job_id: string; name: string; category: string; storage_path: string | null;
  external_url: string | null; mime_type: string | null; version: number; is_current: boolean;
  source: SourceKind; notes: string | null; created_at: string;
  size_bytes: number | null;
  source_ref: string | null;
};

export type JobDebrief = {
  id: string; job_id: string; raw_text: string; source: SourceKind; created_at: string; updated_at: string;
};

export type JobMemory = {
  id: string; job_id: string | null; client_id: string | null; debrief_id: string | null;
  category: "keep" | "change_next_time" | "equipment_issue" | "missing_gear" | "client_follow_up" | "purchase_idea" | "technical_lesson" | "general";
  summary: string; detail: string | null; tags: string[]; source: SourceKind; created_at: string;
  updated_at: string;
};

export type IntegrationConnection = {
  provider: "gmail" | "google_calendar" | "openai"; status: "disconnected" | "configured" | "connected" | "error";
  account_label: string | null; last_synced_at: string | null; last_error: string | null; metadata: Json; updated_at: string;
};

export type PackItem = {
  id: string;
  job_id: string;
  item_name: string;
  quantity_planned: number;
  quantity_packed: number;
  quantity_out: number;
  quantity_returned: number;
  state: PackState;
  notes: string | null;
  created_at: string;
  updated_at: string;
  source_ref: string | null;
};

export type EmailThread = {
  id: string; gmail_thread_id: string; subject: string; participants: string[]; snippet: string | null;
  latest_message_at: string | null; gmail_url: string | null; first_seen_at: string; last_synced_at: string;
};

export type JobEmailThread = {
  id: string; job_id: string; email_thread_id: string; match_score: number; match_reasons: Json;
  review_status: "candidate" | "included" | "excluded"; reviewed_by: string | null;
  reviewed_at: string | null; created_at: string; updated_at: string;
};

export type EmailMessage = {
  id: string; email_thread_id: string; gmail_message_id: string; sent_at: string | null;
  from_address: string | null; to_addresses: string[]; subject: string | null; snippet: string | null;
  body_text: string | null; gmail_url: string | null; content_hash: string | null;
  created_at: string; updated_at: string;
};

export type EmailAttachment = {
  id: string; email_message_id: string; gmail_attachment_id: string | null; filename: string;
  mime_type: string | null; size_bytes: number | null; document_type: string; source_date: string | null;
  storage_path: string | null; import_status: "mentioned" | "available" | "saved" | "error";
  content_hash: string | null; last_error: string | null; created_at: string; updated_at: string;
};

export type ImportProposal = {
  id: string; job_id: string; email_thread_id: string | null; email_message_id: string | null;
  email_attachment_id: string | null; field_key: string; proposed_value: Json; proposed_text: string;
  confidence: number; source_excerpt: string; source_date: string | null; conflict_group: string | null;
  status: "pending" | "accepted" | "rejected"; decision_note: string | null;
  decided_by: string | null; decided_at: string | null; idempotency_key: string;
  created_at: string; updated_at: string;
};

export type ExternalLink = {
  id: string;
  job_id: string | null;
  operation_id: string | null;
  provider: "gmail" | "google_calendar" | "billcue" | "other";
  external_id: string;
  external_url: string | null;
  metadata: Json;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  job_id: string | null;
  operation_id: string | null;
  action: string;
  summary: string;
  source: SourceKind;
  metadata: Json;
  created_at: string;
};

export type TeamMember = {
  user_id: string;
  display_name: string;
  role: "owner" | "member";
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: Partial<Client> & Pick<Client, "name">;
        Update: Partial<Client>;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: Partial<Job> & Pick<Job, "title">;
        Update: Partial<Job>;
        Relationships: [];
      };
      operations: {
        Row: Operation;
        Insert: Partial<Operation> & Pick<Operation, "title">;
        Update: Partial<Operation>;
        Relationships: [];
      };
      job_changes: {
        Row: JobChange;
        Insert: Partial<JobChange> & Pick<JobChange, "job_id" | "summary" | "source">;
        Update: Partial<JobChange>;
        Relationships: [];
      };
      pack_items: {
        Row: PackItem;
        Insert: Partial<PackItem> & Pick<PackItem, "job_id" | "item_name">;
        Update: Partial<PackItem>;
        Relationships: [];
      };
      external_links: {
        Row: ExternalLink;
        Insert: Partial<ExternalLink> & Pick<ExternalLink, "provider" | "external_id">;
        Update: Partial<ExternalLink>;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityLog;
        Insert: Partial<ActivityLog> & Pick<ActivityLog, "action" | "summary">;
        Update: Partial<ActivityLog>;
        Relationships: [];
      };
      team_members: {
        Row: TeamMember;
        Insert: TeamMember;
        Update: Partial<TeamMember>;
        Relationships: [];
      };
      job_requirements: { Row: JobRequirement; Insert: Partial<JobRequirement> & Pick<JobRequirement, "job_id" | "key" | "label">; Update: Partial<JobRequirement>; Relationships: []; };
      job_documents: { Row: JobDocument; Insert: Partial<JobDocument> & Pick<JobDocument, "job_id" | "name">; Update: Partial<JobDocument>; Relationships: []; };
      job_debriefs: { Row: JobDebrief; Insert: Partial<JobDebrief> & Pick<JobDebrief, "job_id" | "raw_text">; Update: Partial<JobDebrief>; Relationships: []; };
      job_memories: { Row: JobMemory; Insert: Partial<JobMemory> & Pick<JobMemory, "category" | "summary">; Update: Partial<JobMemory>; Relationships: []; };
      integration_connections: { Row: IntegrationConnection; Insert: Partial<IntegrationConnection> & Pick<IntegrationConnection, "provider">; Update: Partial<IntegrationConnection>; Relationships: []; };
      sync_runs: { Row: { id: string; provider: string; status: string; started_at: string; finished_at: string | null; records_seen: number; records_changed: number; error: string | null; metadata: Json; }; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: []; };
      email_threads: { Row: EmailThread; Insert: Partial<EmailThread> & Pick<EmailThread, "gmail_thread_id" | "subject">; Update: Partial<EmailThread>; Relationships: []; };
      job_email_threads: { Row: JobEmailThread; Insert: Partial<JobEmailThread> & Pick<JobEmailThread, "job_id" | "email_thread_id">; Update: Partial<JobEmailThread>; Relationships: []; };
      email_messages: { Row: EmailMessage; Insert: Partial<EmailMessage> & Pick<EmailMessage, "email_thread_id" | "gmail_message_id">; Update: Partial<EmailMessage>; Relationships: []; };
      email_attachments: { Row: EmailAttachment; Insert: Partial<EmailAttachment> & Pick<EmailAttachment, "email_message_id" | "filename">; Update: Partial<EmailAttachment>; Relationships: []; };
      import_proposals: { Row: ImportProposal; Insert: Partial<ImportProposal> & Pick<ImportProposal, "job_id" | "field_key" | "proposed_value" | "proposed_text" | "confidence" | "source_excerpt" | "idempotency_key">; Update: Partial<ImportProposal>; Relationships: []; };
      gmail_credentials: { Row: Record<string, unknown>; Insert: Record<string, never>; Update: Record<string, never>; Relationships: []; };
    };
    Views: {};
    Functions: {
      store_gmail_credentials: { Args: { account_email: string; access_token_ciphertext: string; refresh_token_ciphertext: string | null; token_expires_at: string | null; scopes: string[] }; Returns: undefined };
      get_gmail_credentials: { Args: Record<string, never>; Returns: Array<{ account_email: string; access_token_ciphertext: string | null; refresh_token_ciphertext: string | null; token_expires_at: string | null; scopes: string[]; last_verified_at: string | null; last_error: string | null }> };
      disconnect_gmail: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: {
      job_status: JobStatus;
      operation_status: OperationStatus;
      pack_state: PackState;
      source_kind: SourceKind;
    };
    CompositeTypes: {};
  };
};
