-- ============================================
-- JL大会 参加者管理システム — Supabaseテーブル定義
-- 既存のSupabaseプロジェクトに追加で実行してください
-- ============================================

-- 大会テーブル
create table if not exists jl_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  place text,
  created_at timestamptz default now()
);

-- 参加者テーブル（大会ごとの名簿）
create table if not exists jl_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references jl_events(id) on delete cascade,
  area text,
  company text,
  role text,
  name text not null,
  shikiten boolean default true,   -- 式典参加
  konzin_table int default 0,      -- 懇親会卓番号（0=欠席）
  biko text,                        -- 備考
  meishi text default '未',        -- 名刺交換状態（未/済）
  tokui boolean default false,     -- 得意先フラグ
  created_at timestamptz default now()
);

-- 挨拶チェック・メモ（ユーザーが入力するデータ）
create table if not exists jl_checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references jl_members(id) on delete cascade unique,
  greeted boolean default false,
  note text default '',
  greeted_by text,                  -- 誰がチェックしたか（任意）
  updated_at timestamptz default now()
);

-- 更新日時を自動更新するトリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_checkins_updated on jl_checkins;
create trigger trg_checkins_updated
  before update on jl_checkins
  for each row execute function update_updated_at();

-- インデックス
create index if not exists idx_members_event on jl_members(event_id);
create index if not exists idx_checkins_member on jl_checkins(member_id);

-- Row Level Security（社内ツールのため全許可。必要に応じて絞る）
alter table jl_events enable row level security;
alter table jl_members enable row level security;
alter table jl_checkins enable row level security;

create policy "allow all jl_events" on jl_events for all using (true) with check (true);
create policy "allow all jl_members" on jl_members for all using (true) with check (true);
create policy "allow all jl_checkins" on jl_checkins for all using (true) with check (true);

-- Realtime を有効化（社長とリアルタイム共有するため）
alter publication supabase_realtime add table jl_checkins;
alter publication supabase_realtime add table jl_members;
alter publication supabase_realtime add table jl_events;
