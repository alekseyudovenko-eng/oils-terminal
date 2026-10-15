-- Выполнить один раз в Supabase → SQL Editor.
-- Приводит таблицу market_data к полям, которые пишет lib/prices.ts и читает главная страница.
-- Безопасно запускать повторно: существующие колонки и данные не трогаются.

alter table public.market_data add column if not exists value       numeric;
alter table public.market_data add column if not exists currency    text default 'USD';
alter table public.market_data add column if not exists unit        text default 'USD/MT';
alter table public.market_data add column if not exists metric      text;
alter table public.market_data add column if not exists sources     jsonb default '[]'::jsonb;
alter table public.market_data add column if not exists verified_at timestamptz;

-- Старые строки без verified_at получают время последнего обновления, если такая колонка была.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'market_data' and column_name = 'updated_at') then
    execute 'update public.market_data set verified_at = updated_at::timestamptz
             where verified_at is null and updated_at is not null';
  end if;
end $$;

update public.market_data set verified_at = now() where verified_at is null;
alter table public.market_data alter column verified_at set default now();

-- upsert(..., { onConflict: 'commodity' }) требует уникальности по товару.
-- Если по одному товару есть несколько строк, оставляем самую свежую, остальные удаляем.
-- Посмотреть их перед удалением:
--   select commodity, count(*) from public.market_data group by commodity having count(*) > 1;
delete from public.market_data a
using public.market_data b
where a.commodity = b.commodity
  and (a.verified_at, a.ctid) < (b.verified_at, b.ctid);

create unique index if not exists market_data_commodity_key on public.market_data (commodity);
