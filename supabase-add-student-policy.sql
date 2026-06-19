-- Allow teachers to link/unlink students (update teacher_id on student profiles)
drop policy if exists "Teachers can link students" on profiles;

create policy "Teachers can link students"
  on profiles for update
  using (role = 'student')
  with check (role = 'student');
