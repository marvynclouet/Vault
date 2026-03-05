-- =============================================
-- Vault-PM : Schema Supabase
-- Exécuter dans le SQL Editor du dashboard
-- =============================================

-- 1. Table des profils utilisateur
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text default '',
  display_name text default '',
  avatar_url text default '',
  bio text default '',
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Table des projets
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_name text not null,
  summary text not null default '',
  transcript text not null default '',
  review jsonb default null,
  tasks jsonb not null default '[]'::jsonb,
  synced_to text default null,
  created_at timestamptz default now() not null
);

-- Index pour les requêtes par utilisateur
create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_created_at on public.projects(created_at desc);

-- 2. Table des messages de chat
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  has_updates boolean default false,
  created_at timestamptz default now() not null
);

create index idx_messages_project_id on public.messages(project_id);
create index idx_messages_created_at on public.messages(created_at);

-- 3. Row Level Security (chaque user ne voit que ses données)

alter table public.projects enable row level security;
alter table public.messages enable row level security;

-- Projects : CRUD uniquement pour le propriétaire
create policy "Users can read own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Messages : CRUD pour les messages de ses propres projets
create policy "Users can read own messages"
  on public.messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on public.messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own messages"
  on public.messages for delete
  using (auth.uid() = user_id);
