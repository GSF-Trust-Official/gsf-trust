// TypeScript interfaces matching the D1 database schema exactly.
// Keep in sync with cloudflare/migrations/ (latest: 002_update_user_roles.sql)

export type UserRole = "admin" | "editor" | "viewer" | "member";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  is_active: 0 | 1;
  must_change_password: 0 | 1;
  two_factor_secret: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface Member {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  join_date: string;
  status: "active" | "inactive";
  is_bod: 0 | 1;
  bod_designation: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  member_id: string;
  month: number;
  year: number;
  status: "paid" | "due" | "na";
  amount: number;
  paid_date: string | null;
  mode: "bank" | "upi" | "cash" | null;
  reference: string | null;
  notes: string | null;
  ledger_entry_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  account: "general" | "zakat";
  category: string;
  sub_category: string | null;
  member_id: string | null;
  member_code: string | null;
  description: string;
  amount: number;
  running_balance: number | null;
  source_type: string | null;
  source_id: string | null;
  is_deleted: 0 | 1;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Donation {
  id: string;
  date: string;
  member_id: string | null;
  donor_name: string | null;
  type: "hadiya" | "zakat" | "other";
  category: "general" | "medical" | "scholarship" | "emergency";
  amount: number;
  mode: string | null;
  reference: string | null;
  notes: string | null;
  ledger_entry_id: string | null;
  created_at: string;
}

export interface MedicalCase {
  id: string;
  case_ref: string;
  beneficiary_name: string;
  mask_name: 0 | 1;
  amount_requested: number;
  amount_paid: number;
  amount_external: number;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export interface ScholarshipPayout {
  id: string;
  beneficiary_name: string;
  member_id: string | null;
  academic_year: string;
  amount: number;
  eligibility_notes: string | null;
  paid_on: string;
  ledger_entry_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: "create" | "update" | "delete" | "login" | "logout" | "failed_login";
  entity: string;
  entity_id: string | null;
  before_json: string | null;
  after_json: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
  updated_by: string | null;
}

export interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  member_code: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  linked_member_id: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface ScholarshipAnnouncement {
  id: string;
  title: string;
  description: string;
  eligibility_criteria: string | null;
  deadline: string | null;
  contact: string | null;
  poster_drive_url: string | null;
  documents_drive_url: string | null;
  form_url: string | null;
  is_active: 0 | 1;
  posted_by: string | null;
  created_at: string;
  updated_at: string;
}

// JWT payload shape
export interface JwtPayload {
  sub: string;
  role: "admin" | "viewer";
  name: string;
  exp: number;
}

// Subscription matrix cell (enriched with member data)
export interface SubscriptionMatrixRow {
  member_id: string;
  member_code: string;
  member_name: string;
  months: Record<number, Subscription | null>;
}

// Dashboard KPIs
export interface DashboardKpis {
  total_funds: number;
  general_balance: number;
  zakat_balance: number;
  medical_pool: number;
  outstanding_dues: number;
}
