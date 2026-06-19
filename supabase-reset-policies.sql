-- Drop all existing YKI Vocab policies so the schema can be re-run cleanly
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Teachers can read their students" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Anyone can read teacher profiles by id" on profiles;

drop policy if exists "Teachers manage own lists" on vocab_lists;
drop policy if exists "Students read assigned lists" on vocab_lists;

drop policy if exists "Teachers manage words in their lists" on vocab_words;
drop policy if exists "Students read words in assigned lists" on vocab_words;

drop policy if exists "Teachers manage assignments for their lists" on assignments;
drop policy if exists "Students read own assignments" on assignments;

drop policy if exists "Students insert own results" on quiz_results;
drop policy if exists "Students read own results" on quiz_results;
drop policy if exists "Teachers read results for their lists" on quiz_results;
