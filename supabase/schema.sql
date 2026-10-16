-- Oils Terminal v2 — выполнить один раз в Supabase → SQL Editor.
-- Безопасно запускать повторно.

-- Балансы USDA PSD, тыс. т. Заполняет /api/cron/usda-sync.
create table if not exists public.psd_balances (
  commodity     text    not null,          -- palm | soy | sunflower | rapeseed
  country_code  text    not null,          -- код USDA или WORLD
  country_name  text    not null,
  market_year   integer not null,          -- 2025 = сезон 2025/26
  attribute     text    not null,          -- production | consumption | imports | exports | ending_stocks
  value         numeric not null,
  updated_at    timestamptz not null default now(),
  primary key (commodity, country_code, market_year, attribute)
);

-- Ежедневные снимки котировок и спредов. Заполняет /api/cron/daily-update.
create table if not exists public.price_snapshots (
  day     date    not null,
  series  text    not null,                -- fcpo, zl, brent, pogo ...
  price   numeric,                         -- в родной единице котировки
  usd_t   numeric,                         -- в USD/т (для спредов — сам спред)
  ticker  text,
  primary key (day, series)
);

-- Доступ только с сервера (ключ service role). Анонимный ключ таблицы не видит.
alter table public.psd_balances    enable row level security;
alter table public.price_snapshots enable row level security;

-- Старые таблицы версии 1 (market_data, market_prices, balance_sheet,
-- indonesia_official_rates) сайтом больше не используются. Удалить их можно позже,
-- когда убедитесь, что они не нужны:
--   drop table if exists public.market_data, public.market_prices, public.balance_sheet;
