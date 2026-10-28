# Country pages: licensed and internal sources

Instructions for the Claude session (scheduled task or chat) that refreshes the **Lab country pages** (/lab/countries) with Oil World, MPOB and IMA/MPOC material. All three are internal: they live only in Supabase project `oils-db` (`nufqhavkarnsmhojnupc`) and are shown only in the password-protected Lab. **Never commit their figures to this repository (it is public), never publish them on the public site, Telegram or social media.**

## 1. Oil World country balances → `oilworld_balance`

- Where: SharePoint (MPOC), folder `Oil World Database/Oil World Database YYYY MM Mon/stats/` (Microsoft 365 connector, `sharepoint_folder_search` "Oil World Database", pick the newest month).
- Files (Balance of Oils and Fats, 1000 t, Oct/Sept seasons):
  - Russia `AN17508.HTM`, Ukraine `AN18108.HTM`, Uzbekistan `AN18208.HTM`, Kazakhstan `AN16908.HTM`, Moldova `AN17308.HTM`, Serbia `AN13108.HTM`.
  - EU members: `AN049202.HTM` (production by country) and `AN049203.HTM` (trade with non-EU countries by country; several pages — read with `startPage` 2, 3…). Store EU trade rows with `scope = 'extra_eu'`.
  - Azerbaijan, Georgia, Armenia, Belarus, Kyrgyzstan, Tajikistan, Turkmenistan have no Oil World country balance.
- Columns: `edition` ('YYYY-MM' of the database), `country` (ISO2), `section` (production | imports | exports | consumption | stocks | other), `item` (Oil World name, e.g. 'Palm oil', 'Sunfloweroil', 'Total'; in `other`: population, per_capita, gdp_growth), `season` ('25/26'), `forecast` (true for the 'F' season), `value`.
- Check: the items of each section must add up to its Total (±2 for rounding).

## 2. MPOB exports by destination → `mpob_exports`

- Where: OneDrive `1. International Marketing Agency/2 Reports/MPOB Stat/` (the user puts the newest "MPOC_ MPOB_Exports of OPP …xlsx" there).
- Sheet 1 (summary): total oil palm products (OPP) per country for the period, this year and last year → `product_group = 'TOTAL'`.
- Sheet 2 (detail): continent, country, product group, product, volume and value for both years. The connector shows only the first ~1,800 rows; Central Asia is inside them. Load what is readable; say which countries have no detail.
- Columns: `period` ('Jan-Sep'), `year`, `country` (ISO2), `product_group`, `product`, `volume_t`, `value_rm_mil`, `source_file`.

## 3. IMA / MPOC notes → `country_notes`

- Short findings (2–3 sentences each) from IMA monthly reports, memos and proposals, MPOC MIU country profiles and MPOF papers. One fact per note, in Russian (`text_ru`) and English (`text_en`), with `topic` (market | trade | logistics | policy | buyers), `source` (document title), `source_date`, `source_kind` (ima | mpoc | mpob | oilworld | gtt | media), `sort`.
- Replace a country's notes when a newer document supersedes them; never invent figures; keep the source's numbers and periods.

After loading, the pages pick up new data within an hour (cache tag `country-sources`).
