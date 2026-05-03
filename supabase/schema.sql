-- Team Board — Supabase schema
-- Paste this entire file into Supabase SQL Editor and click Run

create extension if not exists "uuid-ossp";

-- Members (your team)
create table if not exists members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique,
  role text check (role in ('dev', 'qa', 'pm', 'design', 'marketing', 'ops', 'other')),
  slack_user_id text,
  manager_id uuid references members(id),
  active boolean default true,
  created_at timestamptz default now()
);

-- Tasks (the main entity)
create table if not exists tasks (
  id serial primary key,
  title text not null,
  description text,
  assignee_id uuid references members(id),
  created_by_id uuid references members(id),
  status text not null default 'todo' check (status in ('todo', 'inprogress', 'review', 'done', 'blocked')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  est_hours numeric default 0,
  spent_hours numeric default 0,
  source text default 'manual' check (source in ('manual', 'excel', 'github')),
  github_pr_url text,
  github_pr_status text check (github_pr_status in ('open', 'review', 'merged', 'closed', null)),
  repo text,
  escalation_level int default 0,
  last_escalated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tasks_assignee_idx on tasks(assignee_id);
create index if not exists tasks_status_idx on tasks(status);
create index if not exists tasks_due_date_idx on tasks(due_date);

-- Activity log (audit trail)
create table if not exists activity_log (
  id serial primary key,
  task_id int references tasks(id) on delete cascade,
  actor_id uuid references members(id),
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- Time entries (for richer time tracking later)
create table if not exists time_entries (
  id serial primary key,
  task_id int references tasks(id) on delete cascade,
  member_id uuid references members(id),
  hours numeric not null,
  note text,
  logged_at timestamptz default now()
);

-- Auto-update updated_at on tasks
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at_column();

-- Seed some sample data so you can see the board working immediately
insert into members (name, email, role) values
  ('Priya', 'priya@example.com', 'qa'),
  ('Arjun', 'arjun@example.com', 'dev'),
  ('Sana', 'sana@example.com', 'dev'),
  ('Ravi', 'ravi@example.com', 'design'),
  ('Neha', 'neha@example.com', 'pm'),
  ('Vikram', 'vikram@example.com', 'marketing')
on conflict (email) do nothing;

insert into tasks (title, assignee_id, status, priority, due_date, source, est_hours, spent_hours, github_pr_url, github_pr_status)
select 'Login API 500 on bad password', id, 'inprogress', 'high', current_date - 2, 'excel', 4, 3, 'https://github.com/example/repo/pull/482', 'open' from members where name = 'Arjun'
union all
select 'Cart total rounds incorrectly', id, 'review', 'high', current_date + 1, 'excel', 3, 2.5, 'https://github.com/example/repo/pull/485', 'review' from members where name = 'Sana'
union all
select 'Dashboard empty state illustration', id, 'inprogress', 'medium', current_date - 1, 'manual', 6, 4, null, null from members where name = 'Ravi'
union all
select 'Launch announcement copy', id, 'todo', 'low', current_date + 5, 'manual', 3, 0, null, null from members where name = 'Vikram';

-- For now, keep RLS off for simplicity. Enable it later when you add auth.
-- alter table members enable row level security;
-- alter table tasks enable row level security;
