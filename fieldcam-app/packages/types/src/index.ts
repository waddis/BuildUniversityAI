// fieldcam.app shared types
// These types mirror the API contracts for use in web and mobile (via codegen)

export type UUID = string;
export type ISODateTime = string;

// Roles
export type Role = "owner" | "admin" | "manager" | "field_user" | "viewer";
export type MembershipStatus = "active" | "invited" | "suspended";

// Project
export type ProjectStatus = "new" | "active" | "review" | "complete" | "archived";
export type MediaType = "photo" | "video";
export type MediaStatus = "pending" | "processing" | "ready" | "failed";
export type TaskStatus = "open" | "in_progress" | "done" | "canceled";
export type TaskPriority = "low" | "medium" | "high";
export type ReportStatus = "draft" | "generating" | "ready" | "failed";

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

// Entities
export interface User {
  id: UUID;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: ISODateTime;
}

export interface Company {
  id: UUID;
  name: string;
  slug: string;
  created_at: ISODateTime;
}

export interface Membership {
  id: UUID;
  company_id: UUID;
  user_id: UUID;
  role: Role;
  status: MembershipStatus;
  user?: User;
  created_at: ISODateTime;
}

export interface Project {
  id: UUID;
  company_id: UUID;
  name: string;
  project_number: string | null;
  status: ProjectStatus;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  loss_date: ISODateTime | null;
  claim_number: string | null;
  policyholder_name: string | null;
  inspection_type: string | null;
  damage_category: string | null;
  carrier_reference: string | null;
  created_by: UUID;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  media_count?: number;
  assigned_users?: User[];
  tags?: Tag[];
}

export interface Tag {
  id: UUID;
  company_id: UUID;
  name: string;
  color: string | null;
}

export interface MediaItem {
  id: UUID;
  company_id: UUID;
  project_id: UUID;
  uploaded_by: UUID;
  media_type: MediaType;
  storage_key: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  captured_at: ISODateTime | null;
  uploaded_at: ISODateTime;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  status: MediaStatus;
  room_label: string | null;
  area_label: string | null;
  category_label: string | null;
  notes: string | null;
  created_at: ISODateTime;
}

export interface MediaAnnotation {
  id: UUID;
  media_id: UUID;
  created_by: UUID;
  annotation_data: AnnotationData;
  version: number;
  created_at: ISODateTime;
}

export interface AnnotationData {
  elements: AnnotationElement[];
  canvas_width: number;
  canvas_height: number;
}

export type AnnotationElement =
  | { type: "arrow"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { type: "rectangle"; x: number; y: number; w: number; h: number; color: string; width: number }
  | { type: "circle"; cx: number; cy: number; rx: number; ry: number; color: string; width: number }
  | { type: "text"; x: number; y: number; text: string; color: string; fontSize: number };

export interface ProjectNote {
  id: UUID;
  project_id: UUID;
  author_id: UUID;
  body: string;
  author?: User;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Comment {
  id: UUID;
  project_id: UUID | null;
  media_id: UUID | null;
  author_id: UUID;
  body: string;
  author?: User;
  created_at: ISODateTime;
}

export interface FieldTask {
  id: UUID;
  company_id: UUID;
  project_id: UUID;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: UUID | null;
  assignee?: User;
  due_at: ISODateTime | null;
  required_photo: boolean;
  completed_at: ISODateTime | null;
  completed_by: UUID | null;
  created_by: UUID;
  created_at: ISODateTime;
}

export interface Report {
  id: UUID;
  company_id: UUID;
  project_id: UUID;
  title: string;
  status: ReportStatus;
  created_by: UUID;
  pdf_storage_key: string | null;
  download_url?: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  items?: ReportItem[];
}

export interface ReportItem {
  id: UUID;
  report_id: UUID;
  media_id: UUID | null;
  note_text: string | null;
  sort_order: number;
  page_break_before: boolean;
  media?: MediaItem;
}

export interface ShareLink {
  id: UUID;
  company_id: UUID;
  project_id: UUID | null;
  report_id: UUID | null;
  token: string;
  expires_at: ISODateTime | null;
  allow_download: boolean;
  created_at: ISODateTime;
}

export interface Notification {
  id: UUID;
  user_id: UUID;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface ActivityEvent {
  id: UUID;
  company_id: UUID;
  project_id: UUID | null;
  actor_user_id: UUID | null;
  event_type: string;
  entity_type: string;
  entity_id: UUID;
  metadata: Record<string, unknown> | null;
  actor?: User;
  created_at: ISODateTime;
}

// API response wrappers
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface UploadUrlResponse {
  upload_url: string;
  storage_key: string;
  expires_in: number;
}
