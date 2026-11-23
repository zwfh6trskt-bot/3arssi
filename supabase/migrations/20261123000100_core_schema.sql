-- =====================================================================
-- 3ARSSI — 0001 Core schema
-- Content (admin-managed), providers, prices, translations, regions.
-- All primary keys are stable UUIDs; display names live in `translations`.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Shared helpers ------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- Enumerations (as check constraints for easy evolution) --------
-- side:      'bride' | 'groom' | 'both'
-- lang:      'ar' | 'fr' | 'en'
-- unit:      'piece' | 'kg' | 'person' | 'hour' | 'day' | 'package' | 'event' | 'quote'
-- importance:'essential' | 'optional' | 'regional'

-- ---------- Regions -------------------------------------------------------

create table public.wilayas (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,              -- official wilaya code, e.g. '16'
  slug        text not null unique,
  sort_order  int  not null default 0,
  enabled     boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.communes (
  id          uuid primary key default gen_random_uuid(),
  wilaya_id   uuid not null references public.wilayas(id) on delete cascade,
  slug        text not null,
  sort_order  int  not null default 0,
  enabled     boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (wilaya_id, slug)
);
create index communes_wilaya_idx on public.communes(wilaya_id);

-- ---------- Events, categories, content -----------------------------------

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  side        text not null default 'both' check (side in ('bride','groom','both')),
  icon        text,                                -- key of a built-in line icon
  sort_order  int  not null default 0,
  enabled     boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.service_types (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.service_types(id) on delete set null,
  slug        text not null unique,
  icon        text,
  sort_order  int  not null default 0,
  enabled     boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index service_types_parent_idx on public.service_types(parent_id);

-- A category belongs to one event. parent_id != null => subcategory.
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  parent_id   uuid references public.categories(id) on delete cascade,
  slug        text not null,
  side        text not null default 'both' check (side in ('bride','groom','both')),
  icon        text,
  image_url   text,
  sort_order  int  not null default 0,
  enabled     boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, slug)
);
create index categories_event_idx  on public.categories(event_id);
create index categories_parent_idx on public.categories(parent_id);

-- Which provider service types are relevant to a category
create table public.category_service_types (
  category_id     uuid not null references public.categories(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id) on delete cascade,
  primary key (category_id, service_type_id)
);
create index cst_service_idx on public.category_service_types(service_type_id);

-- Guidance attached to a category: tips, suggestions, checklist items,
-- traditions, notes and images (with caption = body).
create table public.content_items (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  kind        text not null check (kind in ('tip','suggestion','checklist','tradition','note','image')),
  importance  text not null default 'optional' check (importance in ('essential','optional','regional')),
  wilaya_id   uuid references public.wilayas(id) on delete set null,   -- regional tag (optional)
  commune_id  uuid references public.communes(id) on delete set null,
  image_url   text,
  sort_order  int  not null default 0,
  enabled     boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index content_items_category_idx on public.content_items(category_id);

-- ---------- Providers -----------------------------------------------------

create table public.providers (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  name                    text not null check (length(trim(name)) > 0),
  primary_service_type_id uuid references public.service_types(id) on delete set null,
  wilaya_id               uuid references public.wilayas(id) on delete set null,
  commune_id              uuid references public.communes(id) on delete set null,
  address                 text,
  phone                   text,
  whatsapp                text,
  instagram               text,
  website                 text,
  featured                boolean not null default false,  -- admin-controlled
  verified                boolean not null default false,  -- admin-controlled, never automatic
  enabled                 boolean not null default true,
  is_demo                 boolean not null default false,
  last_updated_at         timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index providers_service_idx on public.providers(primary_service_type_id);
create index providers_wilaya_idx  on public.providers(wilaya_id);

create table public.provider_services (
  provider_id     uuid not null references public.providers(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id) on delete cascade,
  primary key (provider_id, service_type_id)
);
create index provider_services_type_idx on public.provider_services(service_type_id);

create table public.provider_media (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references public.providers(id) on delete cascade,
  kind          text not null default 'image' check (kind in ('image','video')),
  url           text not null,
  storage_path  text,                 -- set when uploaded to Supabase Storage
  sort_order    int not null default 0,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index provider_media_provider_idx on public.provider_media(provider_id);

create table public.offers (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  valid_from  date,
  valid_to    date,
  enabled     boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index offers_provider_idx on public.offers(provider_id);

-- ---------- Prices --------------------------------------------------------
-- A price_item is a *comparable* product/service with ONE unit
-- (e.g. "Traditional oriental cakes — per piece"). Records of different
-- units or package contents must be separate items, so ranges never mix
-- incomparable offers.

create table public.price_items (
  id              uuid primary key default gen_random_uuid(),
  service_type_id uuid references public.service_types(id) on delete set null,
  slug            text not null unique,
  unit            text not null check (unit in ('piece','kg','person','hour','day','package','event','quote')),
  sort_order      int not null default 0,
  enabled         boolean not null default true,
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index price_items_service_idx on public.price_items(service_type_id);

create table public.price_records (
  id            uuid primary key default gen_random_uuid(),
  price_item_id uuid not null references public.price_items(id) on delete cascade,
  provider_id   uuid references public.providers(id) on delete set null,
  source_label  text,                         -- when not tied to a provider
  wilaya_id     uuid references public.wilayas(id) on delete set null,
  commune_id    uuid references public.communes(id) on delete set null,
  min_price     numeric(14,2) check (min_price is null or min_price >= 0),
  max_price     numeric(14,2) check (max_price is null or max_price >= 0),
  min_quantity  numeric(12,2) check (min_quantity is null or min_quantity > 0),
  price_status  text not null default 'indicative' check (price_status in ('indicative','confirmed')),
  updated_on    date not null default current_date,
  enabled       boolean not null default true,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (max_price is null or min_price is null or max_price >= min_price),
  check (provider_id is not null or coalesce(length(trim(source_label)),0) > 0)
);
create index price_records_item_idx     on public.price_records(price_item_id);
create index price_records_provider_idx on public.price_records(provider_id);
create index price_records_wilaya_idx   on public.price_records(wilaya_id);

-- ---------- Translations --------------------------------------------------
-- One row per (entity, field, language). Editing French never touches
-- Arabic or English rows.

create table public.translations (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
                'event','category','content_item','service_type','provider',
                'provider_media','offer','price_item','price_record','wilaya','commune')),
  entity_id   uuid not null,
  field       text not null,
  lang        text not null check (lang in ('ar','fr','en')),
  value       text not null,
  updated_at  timestamptz not null default now(),
  unique (entity_type, entity_id, field, lang)
);
create index translations_entity_idx on public.translations(entity_type, entity_id);
create index translations_lang_idx   on public.translations(lang);

-- Interface-string overrides. Defaults ship in src/i18n/locales/*.json;
-- a row here overrides one key in one language only.
create table public.ui_translations (
  key        text not null,
  lang       text not null check (lang in ('ar','fr','en')),
  value      text not null,
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);

-- Remove orphan translations when an entity is deleted
create or replace function public.delete_entity_translations()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.translations where entity_type = tg_argv[0] and entity_id = old.id;
  return old;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('events','event'),('categories','category'),('content_items','content_item'),
    ('service_types','service_type'),('providers','provider'),('provider_media','provider_media'),
    ('offers','offer'),('price_items','price_item'),('price_records','price_record'),
    ('wilayas','wilaya'),('communes','commune')) as t(tbl, ent)
  loop
    execute format('create trigger %I after delete on public.%I for each row execute function public.delete_entity_translations(%L)',
                   r.tbl || '_del_tr', r.tbl, r.ent);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
                   r.tbl || '_touch', r.tbl);
  end loop;
end $$;

create trigger translations_touch before update on public.translations
  for each row execute function public.touch_updated_at();
create trigger ui_translations_touch before update on public.ui_translations
  for each row execute function public.touch_updated_at();
