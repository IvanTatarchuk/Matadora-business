-- =============================================================================
-- Matadora — Phase 56: searchable KNR cost-item catalog for kosztorys
-- =============================================================================
-- Replaces the 12-item hardcoded KNR_ITEMS array in src/app/kosztorys/page.tsx
-- with a real, searchable Postgres table. Trigram search (pg_trgm) is used
-- instead of tsvector because it handles partial/typo-tolerant matches on
-- short Polish construction-term fragments without needing a language config.

create extension if not exists pg_trgm;

create table if not exists public.cost_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  unit text not null,
  labor_rate numeric(10, 2) not null default 0,
  material_rate numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cost_items_name_trgm_idx on public.cost_items using gin (name gin_trgm_ops);
create index if not exists cost_items_code_trgm_idx on public.cost_items using gin (code gin_trgm_ops);
create index if not exists cost_items_category_idx on public.cost_items (category);

alter table public.cost_items enable row level security;

drop policy if exists "cost_items_public_read" on public.cost_items;
create policy "cost_items_public_read"
  on public.cost_items for select
  using (true);

insert into public.cost_items (code, name, category, unit, labor_rate, material_rate) values
  ('KNR 4-01 0501-01', 'Posadzki z płytek ceramicznych na kleju — 30×30 cm', 'Posadzki i okładziny', 'm²', 35, 55),
  ('KNR 4-01 0502-01', 'Posadzki z płytek ceramicznych na kleju — 60×60 cm', 'Posadzki i okładziny', 'm²', 42, 85),
  ('KNR 4-01 0503-01', 'Posadzki z płytek gresowych na kleju — 60×60 cm', 'Posadzki i okładziny', 'm²', 45, 95),
  ('KNR 4-01 0504-01', 'Posadzki z płytek gresowych wielkoformatowych — 120×60 cm', 'Posadzki i okładziny', 'm²', 65, 140),
  ('KNR 2-02 0312-01', 'Tynkowanie ścian wewnętrznych gipsem maszynowym', 'Tynki i wykończenia', 'm²', 22, 18),
  ('KNR 2-02 0313-01', 'Tynkowanie ścian zewnętrznych tynkiem cienkowarstwowym', 'Tynki i wykończenia', 'm²', 28, 25),
  ('KNR 2-02 0314-01', 'Tynkowanie sufitów gipsem maszynowym', 'Tynki i wykończenia', 'm²', 30, 20),
  ('KNR 2-02 0401-01', 'Malowanie ścian farbą emulsyjną 2×', 'Tynki i wykończenia', 'm²', 14, 8),
  ('KNR 2-02 0402-01', 'Malowanie sufitów farbą emulsyjną 2×', 'Tynki i wykończenia', 'm²', 16, 8),
  ('KNR 2-02 0403-01', 'Gruntowanie ścian preparatem głębokopenetrującym', 'Tynki i wykończenia', 'm²', 8, 5),
  ('KNR 2-02 0404-01', 'Tapetowanie ścian tapetą flizelinową', 'Tynki i wykończenia', 'm²', 20, 22),
  ('KNR 2-02 0450-01', 'Okładzina ścian panelami ściennymi PCV', 'Tynki i wykończenia', 'm²', 25, 45),
  ('KNR 4-01 0701-01', 'Układanie paneli podłogowych laminowanych', 'Posadzki i okładziny', 'm²', 25, 65),
  ('KNR 4-01 0702-01', 'Układanie podłogi drewnianej (deska barlinecka)', 'Posadzki i okładziny', 'm²', 40, 180),
  ('KNR 4-01 0703-01', 'Cyklinowanie i lakierowanie podłogi drewnianej', 'Posadzki i okładziny', 'm²', 35, 25),
  ('KNR 4-01 0704-01', 'Układanie wykładziny PCV zgrzewanej', 'Posadzki i okładziny', 'm²', 28, 55),
  ('KNR 4-01 0705-01', 'Układanie wykładziny dywanowej', 'Posadzki i okładziny', 'm²', 20, 45),
  ('KNR 4-01 0706-01', 'Wylewka samopoziomująca (posadzka anhydrytowa)', 'Posadzki i okładziny', 'm²', 18, 32),
  ('KNR 2-02 1101-01', 'Sufit podwieszany z płyt gipsowo-kartonowych', 'Sufity podwieszane', 'm²', 55, 45),
  ('KNR 2-02 1102-01', 'Sufit podwieszany kasetonowy 60×60', 'Sufity podwieszane', 'm²', 48, 60),
  ('KNR 2-02 1103-01', 'Sufit napinany (stretch ceiling)', 'Sufity podwieszane', 'm²', 60, 90),
  ('KNR 3-01 0211-01', 'Instalacja elektryczna — punkt oświetleniowy', 'Instalacje elektryczne', 'szt', 120, 80),
  ('KNR 3-01 0301-01', 'Instalacja elektryczna — gniazdo wtyczkowe', 'Instalacje elektryczne', 'szt', 95, 60),
  ('KNR 3-01 0302-01', 'Instalacja elektryczna — gniazdo siłowe 400V', 'Instalacje elektryczne', 'szt', 180, 150),
  ('KNR 3-01 0401-01', 'Montaż rozdzielnicy elektrycznej mieszkaniowej', 'Instalacje elektryczne', 'szt', 350, 450),
  ('KNR 3-01 0501-01', 'Układanie przewodów YDYp w bruzdach', 'Instalacje elektryczne', 'm', 12, 8),
  ('KNR 3-01 0601-01', 'Montaż instalacji odgromowej', 'Instalacje elektryczne', 'm', 25, 30),
  ('KNR 3-01 0701-01', 'Montaż instalacji fotowoltaicznej — panel 450W', 'Instalacje elektryczne', 'szt', 200, 850),
  ('KNR 3-02 0101-01', 'Instalacja sanitarna — punkt wod-kan', 'Instalacje sanitarne', 'szt', 250, 180),
  ('KNR 3-02 0102-01', 'Montaż baterii umywalkowej', 'Instalacje sanitarne', 'szt', 60, 120),
  ('KNR 3-02 0103-01', 'Montaż muszli klozetowej wiszącej z stelażem', 'Instalacje sanitarne', 'szt', 220, 650),
  ('KNR 3-02 0104-01', 'Montaż kabiny prysznicowej', 'Instalacje sanitarne', 'szt', 180, 900),
  ('KNR 3-02 0105-01', 'Montaż wanny akrylowej z obudową', 'Instalacje sanitarne', 'szt', 250, 750),
  ('KNR 3-02 0106-01', 'Montaż zlewozmywaka kuchennego', 'Instalacje sanitarne', 'szt', 80, 250),
  ('KNR 3-02 0201-01', 'Instalacja centralnego ogrzewania — grzejnik płytowy', 'Instalacje sanitarne', 'szt', 150, 320),
  ('KNR 3-02 0202-01', 'Montaż ogrzewania podłogowego wodnego', 'Instalacje sanitarne', 'm²', 65, 95),
  ('KNR 3-02 0301-01', 'Montaż pompy ciepła powietrze-woda', 'Instalacje sanitarne', 'szt', 1800, 12000),
  ('KNR 3-02 0401-01', 'Montaż rekuperatora z rozprowadzeniem kanałów', 'Instalacje sanitarne', 'kpl', 2500, 8500),
  ('KNR 2-01 0101-01', 'Roboty rozbiórkowe — ściany działowe', 'Roboty rozbiórkowe', 'm²', 45, 5),
  ('KNR 2-01 0102-01', 'Demontaż posadzek i wykładzin', 'Roboty rozbiórkowe', 'm²', 20, 3),
  ('KNR 2-01 0103-01', 'Demontaż stolarki okiennej i drzwiowej', 'Roboty rozbiórkowe', 'szt', 80, 0),
  ('KNR 2-01 0104-01', 'Wywóz i utylizacja gruzu budowlanego', 'Roboty rozbiórkowe', 'm³', 60, 40),
  ('KNR 2-01 0105-01', 'Skucie starych tynków', 'Roboty rozbiórkowe', 'm²', 25, 2),
  ('KNR 2-01 0201-01', 'Murowanie ściany działowej z cegły', 'Roboty murowe', 'm²', 65, 85),
  ('KNR 2-01 0202-01', 'Murowanie ściany działowej z bloczków silikatowych', 'Roboty murowe', 'm²', 55, 70),
  ('KNR 2-01 0203-01', 'Murowanie ściany działowej z płyt gipsowo-kartonowych (system GK)', 'Roboty murowe', 'm²', 60, 65),
  ('KNR 2-01 0204-01', 'Murowanie ścian zewnętrznych z bloczków YTONG', 'Roboty murowe', 'm²', 75, 130),
  ('KNR 2-01 0301-01', 'Wykonanie nadproża żelbetowego', 'Roboty murowe', 'm', 90, 60),
  ('KNR 4-01 0101-01', 'Hydroizolacja łazienki (folia w płynie 2×)', 'Hydroizolacje', 'm²', 30, 35),
  ('KNR 4-01 0102-01', 'Hydroizolacja fundamentów — masa bitumiczna', 'Hydroizolacje', 'm²', 25, 22),
  ('KNR 4-01 0103-01', 'Hydroizolacja tarasu membraną PVC', 'Hydroizolacje', 'm²', 45, 60),
  ('KNR 4-01 0104-01', 'Izolacja termiczna ścian — styropian 15 cm', 'Hydroizolacje', 'm²', 35, 55),
  ('KNR 4-01 0105-01', 'Izolacja termiczna poddasza — wełna mineralna', 'Hydroizolacje', 'm²', 28, 40),
  ('KNR 4-02 0101-01', 'Montaż drzwi wewnętrznych z ościeżnicą', 'Stolarka', 'szt', 150, 450),
  ('KNR 4-02 0102-01', 'Montaż drzwi wejściowych antywłamaniowych', 'Stolarka', 'szt', 300, 2200),
  ('KNR 4-02 0103-01', 'Montaż okien PCV z obróbką', 'Stolarka', 'szt', 250, 1100),
  ('KNR 4-02 0104-01', 'Montaż parapetów wewnętrznych', 'Stolarka', 'm', 30, 60),
  ('KNR 4-02 0105-01', 'Montaż parapetów zewnętrznych blaszanych', 'Stolarka', 'm', 35, 45),
  ('KNR 4-02 0106-01', 'Montaż rolet zewnętrznych', 'Stolarka', 'szt', 120, 550),
  ('KNR 4-02 0107-01', 'Montaż bramy garażowej segmentowej', 'Stolarka', 'szt', 450, 3200),
  ('KNR 5-01 0101-01', 'Wykonanie ław fundamentowych żelbetowych', 'Roboty fundamentowe', 'm³', 220, 380),
  ('KNR 5-01 0102-01', 'Wykonanie płyty fundamentowej żelbetowej', 'Roboty fundamentowe', 'm²', 180, 260),
  ('KNR 5-01 0103-01', 'Zbrojenie fundamentów stalą żebrowaną', 'Roboty fundamentowe', 'kg', 4, 5),
  ('KNR 5-01 0104-01', 'Betonowanie fundamentów betonem C25/30', 'Roboty fundamentowe', 'm³', 90, 340),
  ('KNR 5-01 0105-01', 'Wykop pod fundamenty — koparka', 'Roboty fundamentowe', 'm³', 25, 15),
  ('KNR 5-02 0101-01', 'Więźba dachowa drewniana — konstrukcja', 'Roboty dekarskie', 'm²', 85, 180),
  ('KNR 5-02 0102-01', 'Pokrycie dachu dachówką ceramiczną', 'Roboty dekarskie', 'm²', 55, 95),
  ('KNR 5-02 0103-01', 'Pokrycie dachu blachodachówką', 'Roboty dekarskie', 'm²', 40, 65),
  ('KNR 5-02 0104-01', 'Montaż rynien i rur spustowych', 'Roboty dekarskie', 'm', 35, 55),
  ('KNR 5-02 0105-01', 'Montaż okna dachowego', 'Roboty dekarskie', 'szt', 250, 1400),
  ('KNR 5-02 0106-01', 'Izolacja dachu membraną wstępnego krycia', 'Roboty dekarskie', 'm²', 20, 18),
  ('KNR 5-03 0101-01', 'Docieplenie ścian zewnętrznych — styropian + tynk (system ETICS)', 'Elewacje', 'm²', 60, 90),
  ('KNR 5-03 0102-01', 'Malowanie elewacji farbą silikonową', 'Elewacje', 'm²', 25, 20),
  ('KNR 5-03 0103-01', 'Montaż elewacji wentylowanej z paneli HPL', 'Elewacje', 'm²', 120, 280),
  ('KNR 5-03 0104-01', 'Montaż okładziny elewacyjnej z kamienia naturalnego', 'Elewacje', 'm²', 150, 350),
  ('KNR 6-01 0101-01', 'Wylewka betonowa pod kostkę brukową', 'Roboty zewnętrzne', 'm²', 30, 45),
  ('KNR 6-01 0102-01', 'Układanie kostki brukowej betonowej', 'Roboty zewnętrzne', 'm²', 45, 75),
  ('KNR 6-01 0103-01', 'Montaż ogrodzenia panelowego z bramą', 'Roboty zewnętrzne', 'm', 90, 160),
  ('KNR 6-01 0104-01', 'Wykonanie trawnika z siewu', 'Roboty zewnętrzne', 'm²', 8, 6),
  ('KNR 6-01 0105-01', 'Nasadzenia zieleni (krzewy, żywopłot)', 'Roboty zewnętrzne', 'szt', 40, 60),
  ('KNR 7-01 0101-01', 'Montaż kuchni na wymiar z zabudową AGD', 'Zabudowy meblowe', 'kpl', 800, 8500),
  ('KNR 7-01 0102-01', 'Montaż szafy wnękowej z drzwiami przesuwnymi', 'Zabudowy meblowe', 'm²', 250, 650),
  ('KNR 7-01 0103-01', 'Montaż schodów wewnętrznych drewnianych', 'Zabudowy meblowe', 'kpl', 1200, 6500),
  ('KNR 7-02 0101-01', 'Montaż klimatyzatora typu split', 'Instalacje HVAC', 'szt', 450, 2800),
  ('KNR 7-02 0102-01', 'Montaż wentylacji mechanicznej nawiewno-wywiewnej', 'Instalacje HVAC', 'kpl', 1500, 6000),
  ('KNR 7-02 0103-01', 'Montaż kanałów wentylacyjnych', 'Instalacje HVAC', 'm', 40, 60),
  ('KNR 8-01 0101-01', 'Instalacja alarmowa — czujka ruchu', 'Instalacje niskoprądowe', 'szt', 90, 150),
  ('KNR 8-01 0102-01', 'Instalacja monitoringu CCTV — kamera', 'Instalacje niskoprądowe', 'szt', 150, 450),
  ('KNR 8-01 0103-01', 'Okablowanie strukturalne LAN', 'Instalacje niskoprądowe', 'punkt', 60, 40),
  ('KNR 8-01 0104-01', 'Montaż domofonu / wideodomofonu', 'Instalacje niskoprądowe', 'kpl', 200, 550),
  ('KNR 9-01 0101-01', 'Wykonanie stropu żelbetowego monolitycznego', 'Roboty konstrukcyjne', 'm²', 120, 220),
  ('KNR 9-01 0102-01', 'Montaż stropu gęstożebrowego (Teriva)', 'Roboty konstrukcyjne', 'm²', 95, 160),
  ('KNR 9-01 0103-01', 'Zbrojenie stropu stalą żebrowaną', 'Roboty konstrukcyjne', 'kg', 4, 5),
  ('KNR 9-01 0104-01', 'Wykonanie schodów żelbetowych', 'Roboty konstrukcyjne', 'kpl', 2500, 3200),
  ('KNR 9-01 0105-01', 'Wykonanie słupów i wieńców żelbetowych', 'Roboty konstrukcyjne', 'm³', 250, 420),
  ('KNR 4-01 0801-01', 'Montaż listew przypodłogowych', 'Posadzki i okładziny', 'm', 12, 15),
  ('KNR 4-01 0802-01', 'Montaż progów drzwiowych', 'Posadzki i okładziny', 'szt', 25, 35),
  ('KNR 4-01 0901-01', 'Silikonowanie fug w łazience', 'Posadzki i okładziny', 'm', 10, 6),
  ('KNR 2-02 0501-01', 'Wykonanie gładzi gipsowej ścian', 'Tynki i wykończenia', 'm²', 18, 12),
  ('KNR 2-02 0502-01', 'Wykonanie gładzi gipsowej sufitów', 'Tynki i wykończenia', 'm²', 20, 12),
  ('KNR 2-02 0601-01', 'Montaż profili sztukatorskich (listwy gzymsowe)', 'Tynki i wykończenia', 'm', 22, 18),
  ('KNR 3-01 0801-01', 'Montaż oświetlenia LED — taśma z zasilaczem', 'Instalacje elektryczne', 'm', 25, 45),
  ('KNR 3-01 0802-01', 'Montaż tablicy licznikowej', 'Instalacje elektryczne', 'kpl', 400, 600),
  ('KNR 3-02 0501-01', 'Montaż zmiękczacza wody', 'Instalacje sanitarne', 'kpl', 250, 1800),
  ('KNR 3-02 0502-01', 'Montaż podgrzewacza wody (bojler elektryczny)', 'Instalacje sanitarne', 'szt', 180, 850),
  ('KNR 5-02 0201-01', 'Montaż systemu przeciwśniegowego na dachu', 'Roboty dekarskie', 'm', 30, 40),
  ('KNR 5-02 0202-01', 'Wymiana obróbek blacharskich (kominy, kosze)', 'Roboty dekarskie', 'm', 45, 55)
on conflict (code) do nothing;
