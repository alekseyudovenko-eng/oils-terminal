# Global Trade Tracker data in IMA reports

Instructions for any Claude session (scheduled task or chat) that writes the **Monthly Market Report – Regional Review: Europe and Central Asia**, the **Regional Managers Meeting presentation** (Eurasia and Central Asia) or the **presentation write-up / speaker notes**.

## What the data is

- Source: Global Trade Tracker (GTT), IMA subscription. Countries' own customs/statistics data on **imports**, monthly, in tonnes and USD, by supplier country.
- Codes: HS 1511 palm oil, 1512 sunflower/safflower, 1513 palm kernel/coconut, 1516 hydrogenated fats, 1517 margarine and spreads.
- Countries: the 16 countries of the MPOB table (RU, UA, KZ, UZ, AZ, GE, PL, CZ, HU, RO, BG, EE, LV, LT, HR, Serbia = `XS`) plus KG, TJ, TM, AM, BY.
- Loaded automatically on the 1st–11th of each month into Supabase project `oils-db` (id `nufqhavkarnsmhojnupc`). Read it with the Supabase connector (`execute_sql`). The site page /lab/trade (password) shows the same data.
- Licence: GTT data is paid. Use it in IMA/MPOC reports and presentations with the source line below. Never publish GTT tables on the public website, in Telegram or on social media.

Source line to use: **"Source: Global Trade Tracker (national customs/statistics data), IMA calculations."**

## Tables

| Object | What it holds |
|---|---|
| `gtt_trade` | Raw rows: reporter, partner, partner_name, hs, year, month, qty_t, value_usd |
| `gtt_monthly` | Per reporter × hs × month: t_total, t_malaysia, t_indonesia, usd_total, usd_malaysia |
| `gtt_ytd` | Per reporter × hs: imports Jan → `through_month` of `year` vs the same months a year earlier, Malaysia and Indonesia volumes, `mirror_only` flag |
| `gtt_reporter_status` | Per reporter: data source and `last_available` = last month of the country's OWN data |

### Important caveats (always state them)

1. **Comparable period.** Months after a country's `last_available` are filled with mirror data (partners' exports) and are incomplete. Compare only Jan → `through_month` from `gtt_ytd`, which already stops at the last month of own data. State the period per country ("Jan–Aug 2026 vs Jan–Aug 2025").
2. **Mirror-only countries** (`mirror_only = true`: Russia — own data ends March 2025; Belarus; Tajikistan; Turkmenistan): figures are partners' exports. They miss transit via third countries (UAE, EU) and are not comparable with earlier own data. Use them only as an indication and say so.
3. **GTT vs MPOB.** MPOB = Malaysia's exports by destination; GTT = the importing country's customs by origin. They differ (timing, transit, re-exports, product coverage). When they diverge, give both and explain; never "correct" one with the other.
4. Small volumes (< 1,000 t) swing by large percentages — describe them in tonnes, not in %.

## Queries

Palm oil, comparable year-to-date, all countries:
```sql
select r.name as country, y.year, y.through_month, y.mirror_only,
       y.t_ytd, y.t_ytd_prev,
       round(100.0*y.t_ytd/nullif(y.t_ytd_prev,0)-100,1) as chg_pct,
       y.my_ytd, round(100.0*y.my_ytd/nullif(y.t_ytd,0),1) as my_share,
       round(100.0*y.my_ytd_prev/nullif(y.t_ytd_prev,0),1) as my_share_prev,
       round(100.0*y.id_ytd/nullif(y.t_ytd,0),1) as id_share,
       round(y.usd_ytd/nullif(y.t_ytd,0)) as usd_per_t
from gtt_ytd y left join gtt_reporter_status r using (reporter)
where y.hs = '1511' order by y.t_ytd desc nulls last;
```
Same for other products: change `hs` to 1512, 1513, 1516, 1517.

Top suppliers of a country (replace `UZ`, months and years):
```sql
select partner_name, round(sum(qty_t) filter (where year=2026)) t_2026, round(sum(qty_t) filter (where year=2025)) t_2025
from gtt_trade where reporter='UZ' and hs='1511' and month <= 6 group by 1 order by t_2026 desc nulls last limit 8;
```

Monthly series for a chart (last 24 months):
```sql
select year, month, t_total, t_malaysia, t_indonesia from gtt_monthly
where reporter='KZ' and hs='1511' order by year desc, month desc limit 24;
```

## How to use it

### Monthly report
Add section **"4.2 Import Demand by Country (Customs Data, GTT)"** right after the MPOB table and 4.1 Regional Summary (renumber nothing else):
- Table: Country | Period | Palm oil imports, t | Change y/y | Malaysia share | Indonesia share — the 16 MPOB countries, from the palm-oil query. Mark mirror-only rows with an asterisk and a footnote.
- 4–6 bullets: largest markets; where Malaysia's share rose or fell; where total demand moved; notable shifts in 1516/1517 (finished fats) if relevant; one sentence comparing with the MPOB export trend.
- Use these figures in 2 Executive Summary only as 1–2 short points.
- Add the caveats (comparable period, mirror data, GTT vs MPOB) as a short note under the table.

### Regional Managers Meeting presentation
Add or update one slide **"Import demand: customs data (GTT)"**: a bar chart of palm oil imports YTD by country (this year vs last year) with Malaysia's share labelled, plus 3 takeaways. Optionally one slide per focus country (Uzbekistan, Kazakhstan, Azerbaijan, Russia) with the monthly series and top suppliers. Source line on every slide.

### Write-up / speaker notes
For the GTT slide: 1 paragraph — what the data is (importers' customs data, different from MPOB), the 2–3 main movements with numbers and periods, and what it means for Malaysian palm oil (share gains/losses, competitor Indonesia). Mention data limits for Russia.

Numbers must come from the queries above in the same run; never estimate or round beyond what the table shows.

## UN Comtrade: the exporters' side (Malaysia and Indonesia)

- Table `comtrade_trade` (same Supabase project): monthly **exports** of Malaysia (`MYS`) and Indonesia (`IDN`) by destination, HS 1511/1513/1516/1517, tonnes (`qty_t`) and USD, last 24 months. Updated on the 12th of each month. Partners are ISO3 codes (RUS, UZB, KAZ, AZE, UKR, POL …). Comtrade data is public (cite "Source: UN Comtrade").
- Malaysia's data usually ends 1–2 months earlier than GTT importers' data; Indonesia's 2–3 months earlier. Check `max(period)` first.

Exports of palm oil to the region, calendar year (change years):
```sql
select reporter, partner_name, round(sum(qty_t)) t
from comtrade_trade where hs='1511' and period between 202501 and 202512
  and partner in ('RUS','UKR','KAZ','UZB','AZE','GEO','POL','CZE','HUN','ROU','BGR','EST','LVA','LTU','HRV','SRB')
group by 1,2 order by 2,1;
```

Use it to: (a) estimate Russia's palm oil supply after March 2025, when its own customs data stops (Indonesia + Malaysia exports to RUS); (b) compare Malaysia's share as seen by exporters vs by importers (GTT); (c) cross-check MPOB.
Caveat: exporter and importer figures can differ a lot. Example: for 2025 Kazakhstan's customs (GTT) report about 36.6 thousand t of palm oil of Malaysian origin, while Malaysia reports only about 1.4 thousand t shipped directly to Kazakhstan — goods of Malaysian origin often arrive via third countries or traders. Always say which side a number comes from.

## Physical palm product prices (Zyot W Dhon)

- Table `physical_prices` (same Supabase project): daily closing **physical** prices, FOB, USD/t, bulk, collected every business day (~16:10 UTC) from the portal Zyot W Dhon (zyotwdhon.com): Malaysian CPO, Indonesian CPO (inclusive of duties), RBD Palm Oil, RBD Palm Olein, RBD Palm Stearin, PFAD, CPKO, RBD Palm Kernel Oil / Olein / Stearin. History starts 27 Oct 2026.
- Use only in internal IMA/MPOC reports and presentations, with the source line "Source: Zyot W Dhon (zyotwdhon.com), daily closing physical prices, FOB, bulk." Never publish these prices on the public website, in Telegram or on social media (the source reserves all rights).

Monthly averages, last and change for the report month (change the dates):
```sql
with m as (select product, avg(price_usd) avg_m, min(price_usd) lo, max(price_usd) hi, count(*) days
           from physical_prices where day between '2026-11-01' and '2026-11-30' group by product),
     p as (select product, avg(price_usd) avg_p from physical_prices where day between '2026-10-01' and '2026-10-31' group by product),
     l as (select distinct on (product) product, day, price_usd last from physical_prices where day <= '2026-11-30' order by product, day desc)
select m.product, round(m.avg_m,1) avg_month, round(p.avg_p,1) avg_prev, round(100*(m.avg_m/p.avg_p-1),1) chg_pct, m.lo, m.hi, l.last, l.day, m.days
from m left join p using (product) left join l using (product) order by m.product;
```
In the monthly report put them in 3.1 (a small table "Physical palm product prices, FOB USD/t: monthly average, change m/m, month low–high") and comment on the olein–CPO and stearin spreads; in the Regional Managers Meeting presentation — one line or a small table on the prices slide. If the previous month has fewer than 10 price days, say the comparison is partial.
