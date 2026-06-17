-- 0016: Codes&More per-discipline code adoptions, granular to jurisdiction,
-- plus trade scoping on reports and citation provenance on requirements.
--
-- Trades (roofing, exterior, mechanical, electrical, plumbing) each map to an
-- adoption DISCIPLINE. Disciplines are adopted by jurisdictions on separate
-- cycles from the building code, so a trade's edition is resolved from the
-- most-specific VERIFIED row here (place > county > state); no verified row at
-- any level => the report renders "edition adopted per AHJ — confirm locally"
-- and never asserts a year. cm_state_adoptions / cm_local_adoptions remain the
-- source for the 'building' discipline (roofing/exterior) and are untouched.
--
-- Additive and reversible. Shared production project eitnccqaysidqvgudeeb.

create table if not exists public.cm_discipline_adoptions (
    id           uuid primary key default gen_random_uuid(),
    level        text not null check (level in ('state','county','place')),
    state_abbr   text not null,                              -- always set
    county_fips  text,                                       -- set for county/place
    place_fips   text,                                       -- set for place
    discipline   text not null check (discipline in ('building','mechanical','electrical','plumbing')),
    code         text not null,                              -- 'IMC','NEC','IPC','UPC','IRC','IBC'
    edition      text not null,                              -- '2021', '2020' (NEC), ...
    verified_at  date,                                       -- date the adoption was read from a primary source
    source_url   text,                                       -- the loaded source
    confidence   text check (confidence in ('high','medium','low')),
    created_at   timestamptz not null default now()
);

-- One adoption per (jurisdiction level, FIPS, discipline). coalesce keeps the
-- unique index usable when county/place FIPS are null (state-level rows).
create unique index if not exists cm_discipline_adoptions_key
    on public.cm_discipline_adoptions
    (level, state_abbr, coalesce(county_fips,''), coalesce(place_fips,''), discipline);

create index if not exists cm_discipline_adoptions_lookup
    on public.cm_discipline_adoptions (state_abbr, discipline);

-- Reports are scoped to the user-selected trade(s).
alter table public.cm_reports
    add column if not exists trades text[] not null default '{}';

-- Per-requirement citation provenance (mirrors what cmlibrary attaches to each
-- row): which trade, the loaded source URL, the confidence tier, the
-- verification date, and the resolved edition year.
alter table public.cm_requirements
    add column if not exists trade       text,
    add column if not exists source_url  text,
    add column if not exists confidence  text,
    add column if not exists verified_at date,
    add column if not exists edition     text;
