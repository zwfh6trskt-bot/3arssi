-- =====================================================================
-- 3ARSSI — 0002 Accounts, roles and personal planning
-- One plan per user ("my wedding"). The plan is shared-ready through
-- plan_members (future family collaboration).
-- Budgets are PER EVENT and PER SIDE. There is deliberately no
-- wedding-wide budget table, column or view.
-- =====================================================================

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  role           text not null default 'user' check (role in ('user','editor','admin')),
  preferred_lang text check (preferred_lang in ('ar','fr','en')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile automatically for every new auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.plans (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table public.plan_members (
  plan_id    uuid not null references public.plans(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);
create index plan_members_user_idx on public.plan_members(user_id);

-- Owner is automatically a member
create or replace function public.add_plan_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.plan_members(plan_id, user_id, role) values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;
create trigger plans_add_owner after insert on public.plans
  for each row execute function public.add_plan_owner();

-- The user's own event list. event_id null => custom event created by the user.
create table public.plan_events (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  event_id    uuid references public.events(id) on delete set null,
  custom_name text,
  side        text not null default 'both' check (side in ('bride','groom','both')),
  sort_order  int not null default 0,
  enabled     boolean not null default true,
  removed_at  timestamptz,          -- user removed a suggested event (restorable)
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (plan_id, event_id)
);
create index plan_events_plan_idx on public.plan_events(plan_id);

-- The user's view of an event's categories (overrides + custom ones).
create table public.plan_categories (
  id            uuid primary key default gen_random_uuid(),
  plan_event_id uuid not null references public.plan_events(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  custom_name   text,
  side          text not null default 'both' check (side in ('bride','groom','both')),
  enabled       boolean not null default true,
  sort_order    int not null default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (plan_event_id, category_id)
);
create index plan_categories_event_idx on public.plan_categories(plan_event_id);

-- Independent budget of ONE event for ONE side.
create table public.event_budgets (
  id            uuid primary key default gen_random_uuid(),
  plan_event_id uuid not null references public.plan_events(id) on delete cascade,
  side          text not null check (side in ('bride','groom')),
  total_amount  numeric(14,2) not null default 0 check (total_amount >= 0),
  currency      text not null default 'DZD',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (plan_event_id, side)
);

-- Planned amount for a category (NOT spending).
create table public.category_allocations (
  id               uuid primary key default gen_random_uuid(),
  plan_category_id uuid not null references public.plan_categories(id) on delete cascade,
  side             text not null check (side in ('bride','groom')),
  amount           numeric(14,2) not null default 0 check (amount >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (plan_category_id, side)
);

-- Money actually paid or committed. Always a separate, explicit action.
create table public.expenses (
  id               uuid primary key default gen_random_uuid(),
  plan_event_id    uuid not null references public.plan_events(id) on delete cascade,
  plan_category_id uuid references public.plan_categories(id) on delete set null,
  side             text not null check (side in ('bride','groom')),
  label            text not null check (length(trim(label)) > 0),
  amount           numeric(14,2) not null check (amount > 0),
  kind             text not null default 'paid' check (kind in ('paid','committed')),
  provider_id      uuid references public.providers(id) on delete set null,
  spent_on         date,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index expenses_event_idx    on public.expenses(plan_event_id);
create index expenses_category_idx on public.expenses(plan_category_id);

-- Checklist progress: either a ticked admin checklist item or a custom task.
create table public.plan_tasks (
  id               uuid primary key default gen_random_uuid(),
  plan_category_id uuid not null references public.plan_categories(id) on delete cascade,
  content_item_id  uuid references public.content_items(id) on delete cascade,
  label            text,
  done             boolean not null default false,
  done_at          timestamptz,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (plan_category_id, content_item_id),
  check (content_item_id is not null or coalesce(length(trim(label)),0) > 0)
);
create index plan_tasks_category_idx on public.plan_tasks(plan_category_id);

-- Saved estimate lines (quantity × stored price range)
create table public.plan_estimates (
  id               uuid primary key default gen_random_uuid(),
  plan_category_id uuid not null references public.plan_categories(id) on delete cascade,
  side             text not null check (side in ('bride','groom')),
  price_item_id    uuid not null references public.price_items(id) on delete cascade,
  quantity         numeric(12,2) not null check (quantity > 0),
  wilaya_id        uuid references public.wilayas(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index plan_estimates_category_idx on public.plan_estimates(plan_category_id);

create table public.saved_providers (
  plan_id     uuid not null references public.plans(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  note        text,
  created_at  timestamptz not null default now(),
  primary key (plan_id, provider_id)
);

do $$
declare t text;
begin
  foreach t in array array['plans','plan_events','plan_categories','event_budgets',
                           'category_allocations','expenses','plan_tasks','plan_estimates']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;
