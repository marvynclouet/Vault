-- Migration 001 : quick_notes + user_settings
-- Exécuter dans le SQL Editor si la DB existe déjà

-- Table quick_notes (inbox d'idées)
create table if not exists public.quick_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  status text default 'pending' check (status in ('pending', 'converted', 'dismissed')),
  converted_to_project uuid references public.projects(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_quick_notes_user_id on public.quick_notes(user_id);
create index if not exists idx_quick_notes_status on public.quick_notes(status);

alter table public.quick_notes enable row level security;

create policy "Users can read own quick_notes"
  on public.quick_notes for select using (auth.uid() = user_id);
create policy "Users can insert own quick_notes"
  on public.quick_notes for insert with check (auth.uid() = user_id);
create policy "Users can update own quick_notes"
  on public.quick_notes for update using (auth.uid() = user_id);
create policy "Users can delete own quick_notes"
  on public.quick_notes for delete using (auth.uid() = user_id);

-- Table user_settings (préférences notifications)
create table if not exists public.user_settings (
  id uuid references auth.users(id) on delete cascade primary key,
  notifications_daily boolean default true,
  notifications_deadline boolean default true,
  notifications_weekly boolean default true,
  daily_reminder_hour int default 9,
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can read own settings"
  on public.user_settings for select using (auth.uid() = id);
create policy "Users can insert own settings"
  on public.user_settings for insert with check (auth.uid() = id);
create policy "Users can update own settings"
  on public.user_settings for update using (auth.uid() = id);
