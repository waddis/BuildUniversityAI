export type Project = {
  id: string;
  company_id: string;
  name: string;
  project_number: string | null;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  claim_number: string | null;
  policyholder_name: string | null;
  damage_category: string | null;
  inspection_type: string | null;
  carrier_reference: string | null;
  loss_date: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  media_count: number;
};

export type ProjectListResponse = {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
};

export type MediaItem = {
  id: string;
  project_id: string;
  uploaded_by: string;
  media_type: string;
  storage_key: string;
  original_filename: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  status: string;
  room_label: string | null;
  area_label: string | null;
  notes: string | null;
  captured_at: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type MediaListResponse = {
  items: MediaItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
};

export type UploadURLResponse = {
  upload_url: string;
  storage_key: string;
  expires_in: number;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Membership = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  status: string;
  user: { id: string; email: string; full_name: string | null } | null;
  created_at: string;
};

export type DashboardStats = {
  projects: number;
  media: number;
  open_tasks: number;
  team: number;
};
