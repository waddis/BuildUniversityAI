-- Rollback 0016: drop the discipline-adoption table, report trade scoping, and
-- requirement provenance columns.

drop table if exists public.cm_discipline_adoptions;

alter table public.cm_reports
    drop column if exists trades;

alter table public.cm_requirements
    drop column if exists trade,
    drop column if exists source_url,
    drop column if exists confidence,
    drop column if exists verified_at,
    drop column if exists edition;
