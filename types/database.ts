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
  status: JobStatus;
  brief: string | null;
  intent: string | null;
  google_calendar_event_id: string | null;
  source_email_thread_id: string | null;
  precedent_job_id: string | null;
  readiness: number;
  created_at: string;
  updated_at: string;
};

export type Operation = {
  id: string;
  title: string;
  owner: "Cameron" | "Beth" | null;
  due_at: string | null;
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
  created_at: string;
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
    };
    Views: {};
    Functions: {};
    Enums: {
      job_status: JobStatus;
      operation_status: OperationStatus;
      pack_state: PackState;
      source_kind: SourceKind;
    };
    CompositeTypes: {};
  };
};
