-- =====================================================================
-- 3ARSSI — 0003 Roles, Row Level Security, grants
-- Roles: user (default) · editor (manages content) · admin (also users & demo data)
-- Enforcement happens HERE, in the database — never in frontend code.
-- =====================================================================

create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anonymous');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('editor','admin'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_plan_member(p_plan uuid, p_write boolean default false)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.plan_members
    where plan_id = p_plan and user_id = auth.uid()
      and (not p_write or role in ('owner','editor')));
$$;

create or replace function public.plan_of_event(p_plan_event uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select plan_id from public.plan_events where id = p_plan_event;
$$;

create or replace function public.plan_of_category(p_plan_category uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select pe.plan_id from public.plan_categories pc
  join public.plan_events pe on pe.id = pc.plan_event_id
  where pc.id = p_plan_category;
$$;

-- ---------- Content tables: public read (enabled rows), staff write -------

do $$
declare t text;
begin
  foreach t in array array['wilayas','communes','events','service_types','categories',
                           'content_items','providers','price_items','price_records','offers']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (enabled or public.is_staff())', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.is_staff())', t || '_ins', t);
    execute format('create policy %I on public.%I for update using (public.is_staff()) with check (public.is_staff())', t || '_upd', t);
    execute format('create policy %I on public.%I for delete using (public.is_staff())', t || '_del', t);
  end loop;

  foreach t in array array['category_service_types','provider_services','provider_media',
                           'translations','ui_translations']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.is_staff())', t || '_ins', t);
    execute format('create policy %I on public.%I for update using (public.is_staff()) with check (public.is_staff())', t || '_upd', t);
    execute format('create policy %I on public.%I for delete using (public.is_staff())', t || '_del', t);
  end loop;
end $$;

-- ---------- Profiles -----------------------------------------------------

alter table public.profiles enable row level security;
create policy profiles_self_read  on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_upd   on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Users may edit only their own name and language — never their role.
revoke update on public.profiles from anonymous, authenticated;
grant  update (display_name, preferred_lang) on public.profiles to authenticated;

create or replace function public.set_user_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_role not in ('user','editor','admin') then raise exception 'invalid role'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'admins cannot demote themselves'; end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

-- Admin user list (emails live in neon_auth."user", which the client cannot read)
create or replace function public.admin_list_users()
returns table (id uuid, email text, display_name text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.display_name, p.role, p.created_at
    from public.profiles p join neon_auth."user" u on u.id = p.id
    order by p.created_at;
end $$;

-- Remove all rows flagged is_demo (admin only). Real content is untouched.
create or replace function public.delete_demo_content()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  delete from public.price_records  where is_demo;
  delete from public.price_items    where is_demo;
  delete from public.offers         where is_demo;
  delete from public.provider_media where is_demo;
  delete from public.providers      where is_demo;
  delete from public.content_items  where is_demo;
  delete from public.categories     where is_demo;
  delete from public.events         where is_demo;
  delete from public.service_types  where is_demo;
  delete from public.communes       where is_demo;
  delete from public.wilayas        where is_demo;
end $$;

-- Creates the signed-in user's profile on first use and returns it.
create or replace function public.ensure_profile()
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); r public.profiles;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.profiles (id, display_name)
    select u.id, coalesce(nullif(trim(u.name), ''), split_part(u.email, '@', 1))
    from neon_auth."user" u where u.id = v_uid
  on conflict (id) do nothing;
  select * into r from public.profiles where id = v_uid;
  return r;
end $$;

-- ---------- Personal planning: members only ------------------------------

alter table public.plans enable row level security;
create policy plans_read on public.plans for select using (public.is_plan_member(id));
create policy plans_ins  on public.plans for insert with check (owner_id = auth.uid());
create policy plans_upd  on public.plans for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy plans_del  on public.plans for delete using (owner_id = auth.uid());

alter table public.plan_members enable row level security;
create policy plan_members_read on public.plan_members for select using (user_id = auth.uid() or public.is_plan_member(plan_id));
-- Invitations are a future feature: only the plan owner may manage members.
create policy plan_members_write on public.plan_members for all
  using (exists (select 1 from public.plans p where p.id = plan_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.plans p where p.id = plan_id and p.owner_id = auth.uid()));

alter table public.plan_events enable row level security;
create policy pe_read  on public.plan_events for select using (public.is_plan_member(plan_id));
create policy pe_write on public.plan_events for all using (public.is_plan_member(plan_id, true)) with check (public.is_plan_member(plan_id, true));

alter table public.saved_providers enable row level security;
create policy sp_read  on public.saved_providers for select using (public.is_plan_member(plan_id));
create policy sp_write on public.saved_providers for all using (public.is_plan_member(plan_id, true)) with check (public.is_plan_member(plan_id, true));

do $$
declare t text;
begin
  foreach t in array array['plan_categories','event_budgets','expenses']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (public.is_plan_member(public.plan_of_event(plan_event_id)))', t || '_read', t);
    execute format('create policy %I on public.%I for all using (public.is_plan_member(public.plan_of_event(plan_event_id), true)) with check (public.is_plan_member(public.plan_of_event(plan_event_id), true))', t || '_write', t);
  end loop;
  foreach t in array array['category_allocations','plan_tasks','plan_estimates']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (public.is_plan_member(public.plan_of_category(plan_category_id)))', t || '_read', t);
    execute format('create policy %I on public.%I for all using (public.is_plan_member(public.plan_of_category(plan_category_id), true)) with check (public.is_plan_member(public.plan_of_category(plan_category_id), true))', t || '_write', t);
  end loop;
end $$;

-- ---------- Grants (explicit, in case project defaults change) -----------

grant usage on schema public to anonymous, authenticated;
grant select on all tables in schema public to anonymous, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
revoke update on public.profiles from authenticated;
grant  update (display_name, preferred_lang) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;
grant execute on function public.set_user_role(uuid, text), public.admin_list_users(),
                          public.delete_demo_content(), public.ensure_profile(), public.is_staff(), public.is_admin(),
                          public.current_role_name() to authenticated;
revoke execute on function public.set_user_role(uuid, text), public.admin_list_users(),
                           public.delete_demo_content(), public.ensure_profile() from anonymous, public;
