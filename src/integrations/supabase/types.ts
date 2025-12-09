// Minimal Supabase types for development

export type User = {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  role: string;
  created_at: string;
  tl_id?: string;
  region_id?: string;
};

export type Region = {
  id: string;
  name: string;
};

export type TeamLeader = {
  id: string;
  full_name: string;
  region_id?: string;
};

export type Sale = {
  id: string;
  user_id: string;
  created_at: string;
  is_paid?: boolean;
  // Add other fields as needed
};
