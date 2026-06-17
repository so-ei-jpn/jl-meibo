import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type JLEvent = {
  id: string;
  name: string;
  event_date: string | null;
  place: string | null;
  created_at: string;
};

export type JLMember = {
  id: string;
  event_id: string;
  area: string | null;
  company: string | null;
  role: string | null;
  name: string;
  shikiten: boolean;
  konzin_table: number;
  biko: string | null;
  meishi: string;
  tokui: boolean;
  created_at: string;
};

export type JLCheckin = {
  id: string;
  member_id: string;
  greeted: boolean;
  note: string;
  greeted_by: string | null;
  updated_at: string;
};

export type MemberWithCheckin = JLMember & {
  checkin?: JLCheckin;
};
