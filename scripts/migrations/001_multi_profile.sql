create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  icp_keywords jsonb not null default '[]'::jsonb,
  scan_queries jsonb not null default '[]'::jsonb,
  message_templates jsonb not null default '{}'::jsonb,
  portfolio_url text not null default '',
  pdf_url text not null default '',
  accent_color text not null default '#3ecf8e',
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

alter table leads
  add column if not exists profile_id uuid references profiles(id),
  add column if not exists status text default 'new',
  add column if not exists rating integer default 3;

create table if not exists outreach (
  id bigserial primary key,
  lead_id bigint not null references leads(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  channel text not null check (channel in ('linkedin', 'email', 'whatsapp', 'instagram')),
  message_body text not null,
  status text not null default 'ready_to_send' check (status in ('ready_to_send', 'queued', 'sent', 'replied', 'bounced', 'skipped', 'failed')),
  prepared_at timestamptz not null default now(),
  sent_at timestamptz,
  replied_at timestamptz,
  reply_snippet text,
  error text,
  provider_id text
);
