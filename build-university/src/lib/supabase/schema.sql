-- ============================================================================
-- BuildRight 3D — Interactive Construction Training Platform
-- Database Schema v1.0
-- Run in Supabase SQL Editor (drop old tables first if migrating)
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- USERS & ORGANIZATIONS
-- ============================================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  role text not null default 'learner' check (role in ('admin', 'editor', 'learner')),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null default 'company' check (type in ('company', 'school', 'enterprise')),
  stripe_customer_id text,
  subscription_tier text check (subscription_tier in ('crew', 'company', 'enterprise')),
  subscription_status text default 'inactive',
  max_seats int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

alter table profiles
  add constraint fk_profiles_org foreign key (organization_id)
  references organizations(id) on delete set null;

-- ============================================================================
-- HOUSE MODELS
-- ============================================================================

create table if not exists house_models (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  description text,
  complexity_level text not null default 'intermediate'
    check (complexity_level in ('simple', 'intermediate', 'complex', 'expert')),
  active_version int not null default 1,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists house_model_versions (
  id uuid primary key default uuid_generate_v4(),
  house_model_id uuid not null references house_models(id) on delete cascade,
  version int not null,
  model_manifest jsonb not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(house_model_id, version)
);

-- ============================================================================
-- ASSEMBLIES
-- ============================================================================

create table if not exists assemblies (
  id uuid primary key default uuid_generate_v4(),
  house_model_version_id uuid not null references house_model_versions(id) on delete cascade,
  parent_id uuid references assemblies(id) on delete set null,
  slug text not null,
  name text not null,
  category text not null,
  system text not null,
  phase text not null,
  subphase text,
  mesh_key text,
  install_order int not null default 0,
  visibility_group text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_assemblies_phase on assemblies(phase);
create index idx_assemblies_system on assemblies(system);
create index idx_assemblies_model on assemblies(house_model_version_id);

create table if not exists assembly_dependencies (
  id uuid primary key default uuid_generate_v4(),
  assembly_id uuid not null references assemblies(id) on delete cascade,
  depends_on_assembly_id uuid not null references assemblies(id) on delete cascade,
  dependency_type text not null default 'required'
    check (dependency_type in ('required', 'recommended', 'sequential')),
  unique(assembly_id, depends_on_assembly_id)
);

-- ============================================================================
-- CURRICULUM
-- ============================================================================

create table if not exists modules (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  description text,
  phase text not null,
  track text not null default 'general',
  order_index int not null default 0,
  difficulty text not null default 'beginner'
    check (difficulty in ('beginner', 'intermediate', 'advanced', 'expert')),
  estimated_hours numeric(4,1),
  icon_name text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lessons (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references modules(id) on delete cascade,
  slug text not null unique,
  title text not null,
  objective text,
  description text,
  difficulty text not null default 'beginner'
    check (difficulty in ('beginner', 'intermediate', 'advanced', 'expert')),
  lesson_type text not null default 'learn'
    check (lesson_type in ('learn', 'inspect', 'compare', 'build', 'quiz')),
  house_model_id uuid references house_models(id),
  duration_minutes int,
  order_index int not null default 0,
  prerequisite_lesson_id uuid references lessons(id),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lessons_module on lessons(module_id);

create table if not exists lesson_steps (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  step_number int not null,
  title text not null,
  instruction text,
  narration text,
  action_type text not null default 'observe'
    check (action_type in ('observe', 'click', 'identify', 'sequence', 'quiz', 'compare')),
  target_assembly_ids uuid[] default '{}',
  camera_preset jsonb,
  exploded_state jsonb,
  hidden_groups text[] default '{}',
  highlighted_groups text[] default '{}',
  code_reference_ids uuid[] default '{}',
  validation_rule jsonb,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(lesson_id, step_number)
);

-- ============================================================================
-- HOTSPOTS
-- ============================================================================

create table if not exists hotspots (
  id uuid primary key default uuid_generate_v4(),
  assembly_id uuid not null references assemblies(id) on delete cascade,
  label text not null,
  hotspot_type text not null default 'info'
    check (hotspot_type in ('info', 'warning', 'failure', 'inspection', 'code')),
  position jsonb not null default '{"x":0,"y":0,"z":0}',
  content jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CODE REFERENCES
-- ============================================================================

create table if not exists code_references (
  id uuid primary key default uuid_generate_v4(),
  code_family text not null,
  code_section text not null,
  title text not null,
  short_summary text not null,
  long_explanation text,
  jurisdiction_scope text,
  climate_scope text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_code_refs_family on code_references(code_family);

create table if not exists assembly_code_references (
  id uuid primary key default uuid_generate_v4(),
  assembly_id uuid not null references assemblies(id) on delete cascade,
  code_reference_id uuid not null references code_references(id) on delete cascade,
  relevance text default 'primary',
  unique(assembly_id, code_reference_id)
);

-- ============================================================================
-- FAILURE MODES
-- ============================================================================

create table if not exists failure_modes (
  id uuid primary key default uuid_generate_v4(),
  assembly_id uuid not null references assemblies(id) on delete cascade,
  title text not null,
  description text not null,
  severity text not null default 'moderate'
    check (severity in ('minor', 'moderate', 'severe', 'critical')),
  category text not null default 'workmanship'
    check (category in ('workmanship', 'material', 'design', 'environmental', 'sequencing')),
  visual_state jsonb,
  inspection_notes text,
  consequence_notes text,
  prevention_notes text,
  claim_relevance text,
  media_urls text[] default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- QUIZZES
-- ============================================================================

create table if not exists quizzes (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  title text not null,
  passing_score int not null default 70,
  config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- USER PROGRESS
-- ============================================================================

create table if not exists user_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  score int,
  time_spent_seconds int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create table if not exists user_step_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_step_id uuid not null references lesson_steps(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  attempts int not null default 0,
  completed_at timestamptz,
  unique(user_id, lesson_step_id)
);

create index idx_user_progress_user on user_progress(user_id);

-- ============================================================================
-- GLOSSARY & MEDIA
-- ============================================================================

create table if not exists glossary_terms (
  id uuid primary key default uuid_generate_v4(),
  term text not null unique,
  slug text not null unique,
  definition text not null,
  related_terms text[] default '{}',
  media_url text,
  created_at timestamptz not null default now()
);

create table if not exists media_assets (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('image', 'video', '3d_model', 'audio', 'document')),
  storage_path text not null,
  title text,
  alt_text text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table house_models enable row level security;
alter table house_model_versions enable row level security;
alter table assemblies enable row level security;
alter table assembly_dependencies enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table lesson_steps enable row level security;
alter table hotspots enable row level security;
alter table code_references enable row level security;
alter table assembly_code_references enable row level security;
alter table failure_modes enable row level security;
alter table quizzes enable row level security;
alter table user_progress enable row level security;
alter table user_step_progress enable row level security;
alter table glossary_terms enable row level security;
alter table media_assets enable row level security;

-- Public read for published content
create policy "modules_public_read" on modules for select using (status = 'published');
create policy "lessons_public_read" on lessons for select using (status = 'published');
create policy "lesson_steps_public_read" on lesson_steps for select using (true);
create policy "house_models_public_read" on house_models for select using (true);
create policy "model_versions_public_read" on house_model_versions for select using (true);
create policy "assemblies_public_read" on assemblies for select using (true);
create policy "assembly_deps_public_read" on assembly_dependencies for select using (true);
create policy "hotspots_public_read" on hotspots for select using (true);
create policy "code_refs_public_read" on code_references for select using (true);
create policy "assembly_code_refs_public_read" on assembly_code_references for select using (true);
create policy "failure_modes_public_read" on failure_modes for select using (true);
create policy "quizzes_public_read" on quizzes for select using (true);
create policy "glossary_public_read" on glossary_terms for select using (true);
create policy "media_public_read" on media_assets for select using (true);

-- User own data
create policy "profiles_own_read" on profiles for select using (auth.uid() = id);
create policy "profiles_own_update" on profiles for update using (auth.uid() = id);
create policy "progress_own_read" on user_progress for select using (auth.uid() = user_id);
create policy "progress_own_insert" on user_progress for insert with check (auth.uid() = user_id);
create policy "progress_own_update" on user_progress for update using (auth.uid() = user_id);
create policy "step_progress_own_read" on user_step_progress for select using (auth.uid() = user_id);
create policy "step_progress_own_insert" on user_step_progress for insert with check (auth.uid() = user_id);
create policy "step_progress_own_update" on user_step_progress for update using (auth.uid() = user_id);

-- Org access
create policy "org_member_read" on organizations for select
  using (id in (select organization_id from organization_members where user_id = auth.uid()));
create policy "org_members_read" on organization_members for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));

-- Admin full access (content management)
create policy "admin_modules" on modules for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "admin_lessons" on lessons for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "admin_lesson_steps" on lesson_steps for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "admin_assemblies" on assemblies for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "admin_house_models" on house_models for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "admin_code_refs" on code_references for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "admin_failure_modes" on failure_modes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "admin_hotspots" on hotspots for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "admin_profiles" on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger tr_profiles_updated before update on profiles for each row execute function update_updated_at();
create trigger tr_modules_updated before update on modules for each row execute function update_updated_at();
create trigger tr_lessons_updated before update on lessons for each row execute function update_updated_at();
create trigger tr_house_models_updated before update on house_models for each row execute function update_updated_at();
create trigger tr_code_refs_updated before update on code_references for each row execute function update_updated_at();
create trigger tr_user_progress_updated before update on user_progress for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
