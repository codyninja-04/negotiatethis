create extension if not exists "uuid-ossp";

-- Profiles ------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "read_own_profile" on profiles for select using (auth.uid() = id);
create policy "update_own_profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Plan changes come from billing, never from the browser.
revoke update on profiles from authenticated;
grant update (full_name) on profiles to authenticated;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Negotiation sessions ------------------------------------------------------

create table negotiation_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  scenario_type text not null default 'other'
    check (scenario_type in ('salary', 'rent', 'freelance_rate', 'purchase', 'contract_terms', 'other')),
  situation_description text not null check (char_length(situation_description) between 20 and 2000),
  my_target text check (my_target is null or char_length(my_target) <= 200),
  my_walk_away_point text check (my_walk_away_point is null or char_length(my_walk_away_point) <= 200),
  counterparty_context text check (counterparty_context is null or char_length(counterparty_context) <= 1200),
  -- How hard the other side holds its ground.
  stance text not null default 'realistic' check (stance in ('flexible', 'realistic', 'tough')),
  -- Who speaks first. A landlord announcing an increase usually opens, a candidate asking for more usually does.
  opener text not null default 'me' check (opener in ('me', 'them')),
  -- [{ role: 'user' | 'assistant', content, at }]
  messages jsonb not null default '[]',

  -- How it ended, told to us by the user
  outcome text check (outcome is null or outcome in ('deal', 'no_deal', 'walked_away', 'paused')),
  final_terms text check (final_terms is null or char_length(final_terms) <= 300),

  -- Debrief
  approach_strengths text[],
  approach_weaknesses text[],
  tactics_used text[],
  -- [{ name, turn, quote, note }] tactics the user used, even without knowing the name
  tactic_details jsonb,
  -- [{ name, quote, handled, note }] what the counterparty threw at them and how they dealt with it
  counter_tactics jsonb,
  suggested_improvements text[],
  likely_outcome_assessment text,
  overall_score smallint check (overall_score is null or overall_score between 1 and 10),
  -- { anchoring, discovery, concessions, composure } each scored 1 to 5
  skill_scores jsonb,
  value_left text,
  -- { turn, original, rewrite, why } the one line worth saying differently next time
  better_line jsonb,
  -- { prefix, suffix, walk_away, target, their_opening, final } numbers for the deal zone bar, any may be null
  deal_numbers jsonb
);

create index idx_negotiations_user on negotiation_sessions(user_id, created_at desc);

alter table negotiation_sessions enable row level security;
create policy "own_sessions" on negotiation_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
