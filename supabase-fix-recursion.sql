-- Fix: infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Drop the two policies that cause circular reference
drop policy if exists "Teachers manage assignments for their lists" on assignments;
drop policy if exists "Students read assigned lists" on vocab_lists;

-- Step 2: Create helper functions with SECURITY DEFINER
-- (these bypass RLS internally, breaking the circular reference)

create or replace function auth_is_teacher_of_list(p_list_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from vocab_lists
    where id = p_list_id
      and teacher_id = auth.uid()
  );
$$;

create or replace function auth_is_assigned_to_list(p_list_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from assignments
    where list_id = p_list_id
      and student_id = auth.uid()
  );
$$;

-- Step 3: Recreate the policies using the helper functions
create policy "Teachers manage assignments for their lists"
  on assignments for all
  using (auth_is_teacher_of_list(list_id));

create policy "Students read assigned lists"
  on vocab_lists for select
  using (auth_is_assigned_to_list(id));
