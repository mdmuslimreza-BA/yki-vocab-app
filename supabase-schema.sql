-- ============================================================
-- YKI Vocab App — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('teacher', 'student')),
  full_name   text not null,
  email       text not null,
  teacher_id  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- 2. VOCABULARY LISTS
create table if not exists vocab_lists (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,
  created_at  timestamptz default now()
);

-- 3. VOCABULARY WORDS
create table if not exists vocab_words (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references vocab_lists(id) on delete cascade,
  finnish     text not null,
  english     text not null,
  position    int default 0,
  created_at  timestamptz default now()
);

-- 4. ASSIGNMENTS (teacher assigns list to student)
create table if not exists assignments (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references vocab_lists(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(list_id, student_id)
);

-- 5. QUIZ RESULTS
create table if not exists quiz_results (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  list_id     uuid not null references vocab_lists(id) on delete cascade,
  mode        text not null check (mode in ('flashcard', 'mcq')),
  score       int not null,
  total       int not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles    enable row level security;
alter table vocab_lists enable row level security;
alter table vocab_words enable row level security;
alter table assignments enable row level security;
alter table quiz_results enable row level security;

-- PROFILES
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Teachers can read their students"
  on profiles for select using (teacher_id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Allow students to look up a teacher by email when registering
create policy "Anyone can read teacher profiles by id"
  on profiles for select using (role = 'teacher');

-- VOCAB LISTS
create policy "Teachers manage own lists"
  on vocab_lists for all using (teacher_id = auth.uid());

create policy "Students read assigned lists"
  on vocab_lists for select using (
    exists (
      select 1 from assignments
      where assignments.list_id = vocab_lists.id
        and assignments.student_id = auth.uid()
    )
  );

-- VOCAB WORDS
create policy "Teachers manage words in their lists"
  on vocab_words for all using (
    exists (
      select 1 from vocab_lists
      where vocab_lists.id = vocab_words.list_id
        and vocab_lists.teacher_id = auth.uid()
    )
  );

create policy "Students read words in assigned lists"
  on vocab_words for select using (
    exists (
      select 1 from assignments
      join vocab_lists on vocab_lists.id = assignments.list_id
      where vocab_lists.id = vocab_words.list_id
        and assignments.student_id = auth.uid()
    )
  );

-- ASSIGNMENTS
create policy "Teachers manage assignments for their lists"
  on assignments for all using (
    exists (
      select 1 from vocab_lists
      where vocab_lists.id = assignments.list_id
        and vocab_lists.teacher_id = auth.uid()
    )
  );

create policy "Students read own assignments"
  on assignments for select using (student_id = auth.uid());

-- QUIZ RESULTS
create policy "Students insert own results"
  on quiz_results for insert with check (student_id = auth.uid());

create policy "Students read own results"
  on quiz_results for select using (student_id = auth.uid());

create policy "Teachers read results for their lists"
  on quiz_results for select using (
    exists (
      select 1 from vocab_lists
      where vocab_lists.id = quiz_results.list_id
        and vocab_lists.teacher_id = auth.uid()
    )
  );
