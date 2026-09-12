-- ============================================================================
-- NH MATH ACADEMY — DATABASE MIGRATION
-- Run this once in Supabase SQL Editor (Project -> SQL Editor -> New query)
-- ============================================================================

-- 1. PROFILES TABLE (linked 1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  university_email text not null,
  personal_email text not null,
  phone_number text not null,
  whatsapp_number text,
  faculty text,
  department text,
  academic_year text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  is_approved boolean not null default false,
  is_locked boolean not null default false,
  active_session_id uuid,
  created_at timestamptz not null default now()
);

-- 2. COURSES
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text not null,
  description text,
  cover_image_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. ENROLLMENTS
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- 4. CHAPTERS
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index int not null default 1,
  created_at timestamptz not null default now()
);

-- 5. LECTURES
create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  description_latex text,
  youtube_unlisted_id text,
  pdf_storage_path text,
  formula_sheet_latex text,
  order_index int not null default 1,
  created_at timestamptz not null default now()
);

-- 6. LESSON Q&A
create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_text text not null,
  reply_text text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

-- 7. ANNOUNCEMENTS
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- HELPER FUNCTION: is the current user an approved admin? (avoids relying on
-- custom JWT claims, which require extra setup — this checks the profiles
-- table directly and is safe to use inside RLS policies)
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_approved_student()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_approved = true and coalesce(is_locked, false) = false
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.chapters enable row level security;
alter table public.lectures enable row level security;
alter table public.lesson_questions enable row level security;
alter table public.announcements enable row level security;

-- PROFILES
create policy "Admins full control on profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can view own profile" on public.profiles
  for select using (id = auth.uid());

create policy "Users can insert own profile on signup" on public.profiles
  for insert with check (id = auth.uid());

create policy "Users can update limited own fields" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- COURSES
create policy "Admins full control on courses" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Approved students can view published courses" on public.courses
  for select using (is_published = true and public.is_approved_student());

-- ENROLLMENTS
create policy "Admins full control on enrollments" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Students can view own enrollments" on public.enrollments
  for select using (student_id = auth.uid());

-- CHAPTERS
create policy "Admins full control on chapters" on public.chapters
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Approved students can view chapters" on public.chapters
  for select using (public.is_approved_student());

-- LECTURES
create policy "Admins full control on lectures" on public.lectures
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Approved students can view lectures" on public.lectures
  for select using (public.is_approved_student());

-- LESSON QUESTIONS
create policy "Admins full control on lesson_questions" on public.lesson_questions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Students can view own questions" on public.lesson_questions
  for select using (student_id = auth.uid());

create policy "Approved students can ask questions" on public.lesson_questions
  for insert with check (student_id = auth.uid() and public.is_approved_student());

-- ANNOUNCEMENTS
create policy "Admins full control on announcements" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Anyone authenticated can view active announcements" on public.announcements
  for select using (is_active = true and auth.uid() is not null);

-- ============================================================================
-- STORAGE BUCKETS (run once — create via Dashboard or here)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('lecture-pdfs', 'lecture-pdfs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

-- Only approved students (via signed URL flow) or admins may read lecture PDFs.
create policy "Admins manage lecture pdfs" on storage.objects
  for all using (bucket_id = 'lecture-pdfs' and public.is_admin())
  with check (bucket_id = 'lecture-pdfs' and public.is_admin());

create policy "Approved students read lecture pdfs" on storage.objects
  for select using (bucket_id = 'lecture-pdfs' and public.is_approved_student());

create policy "Public can read course covers" on storage.objects
  for select using (bucket_id = 'course-covers');

create policy "Admins manage course covers" on storage.objects
  for all using (bucket_id = 'course-covers' and public.is_admin())
  with check (bucket_id = 'course-covers' and public.is_admin());

-- ============================================================================
-- SEED: first admin
-- After you sign up through the app with your own account, run this once,
-- replacing the email, to promote yourself to admin:
-- ============================================================================
-- update public.profiles set role = 'admin', is_approved = true
-- where university_email = 'your-admin-email@example.edu';
