// lib/instruments.ts — что показываем и как пересчитываем в USD за тонну.
// Котировки берутся со сканера TradingView (задержка 10–15 минут).
// Для каждого инструмента можно указать несколько тикеров: используется первый,
// который вернул данные (некоторые биржи доступны не под всеми префиксами).

export type Group = 'palm' | 'softoils' | 'energy' | 'fx';

/** Как привести цену к USD/т. */
export type ToUsdPerTonne =
  | { kind: 'usd_t' }                 // уже USD/т
  | { kind: 'fx_t'; fx: FxId }        // цена в валюте за тонну → делим на USD/валюта
  | { kind: 'eur_t' }                 // EUR/т → умножаем на EURUSD
  | { kind: 'cents_lb' }              // центы за фунт → × 22.0462
  | { kind: 'usd_gal' }               // USD за галлон → × 312.9 (≈7.45 барр./т)
  | { kind: 'none' };                 // не пересчитываем (нефть в барр., валюты)

export type FxId = 'USDMYR' | 'USDCNY';

export type Instrument = {
  id: string;
  name: string;        // как показываем на сайте
  short: string;       // для бегущей строки
  venue: string;       // биржа / контракт
  group: Group;
  unit: string;        // родная единица котировки
  tickers: string[];   // кандидаты TradingView
  toUsdT: ToUsdPerTonne;
  /** Проверка, что найден именно нужный контракт (по описанию TradingView). */
  expect?: RegExp;
  /**
   * Конкретный ближайший контракт на дату (например, ICEEUR:BRNZ2026). Пробуется раньше,
   * чем непрерывный BRN1!: TradingView переключает BRN1! на следующий месяц заранее,
   * и в день переключения изменение за день считается от закрытия другого контракта.
   */
  frontContract?: (now: Date) => string;
  /**
   * Запасной источник для бирж, которых нет на сканере TradingView (Далянь):
   * код непрерывного основного контракта в котировках Sina Finance, например 'P0'.
   */
  sina?: string;
};

const MONTH_CODES = 'FGHJKMNQUVXZ';

/** Последний рабочий день (пн–пт) месяца; month — 0..11, может выходить за пределы года. */
function lastBusinessDay(year: number, month: number): Date {
  const d = new Date(Date.UTC(year, month + 1, 0));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/**
 * Ближайший фьючерс Brent ICE. Контракт месяца M торгуется до последнего рабочего дня
 * месяца M−2 (декабрьский — до конца октября). Праздники биржи не учитываются:
 * в редкий праздничный последний день просто раньше перейдём на непрерывный тикер.
 */
export function brentFrontTicker(now: Date): string {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let k = 1; k <= 3; k++) {
    const y = now.getUTCFullYear(), m = now.getUTCMonth() + k; // месяц поставки (может быть > 11)
    const expiry = lastBusinessDay(y, m - 2).getTime();
    if (today <= expiry) {
      const cy = y + Math.floor(m / 12), cm = m % 12;
      return `ICEEUR:BRN${MONTH_CODES[cm]}${cy}`;
    }
  }
  return 'ICEEUR:BRN1!';
}

/** Тикеры-кандидаты на сейчас: сначала конкретный контракт (если задан), потом запасные. */
export function tickersFor(inst: Instrument, now = new Date()): string[] {
  return inst.frontContract ? [inst.frontContract(now), ...inst.tickers] : inst.tickers;
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'fcpo', name: 'Пальмовое масло CPO', short: 'FCPO', venue: 'Bursa Malaysia, 3-й месяц',
    group: 'palm', unit: 'MYR/т', tickers: ['MYX:FCPO1!'], toUsdT: { kind: 'fx_t', fx: 'USDMYR' },
    expect: /palm/i,
  },
  {
    id: 'dce_olein', name: 'Пальмовый олеин', short: 'DCE олеин', venue: 'Dalian, основной контракт',
    group: 'palm', unit: 'CNY/т', tickers: ['DCE:P1!', 'DALIAN:P1!'], toUsdT: { kind: 'fx_t', fx: 'USDCNY' }, sina: 'P0',
    expect: /palm/i,
  },
  {
    id: 'zl', name: 'Соевое масло', short: 'Соя CBOT', venue: 'CBOT, ближайший',
    group: 'softoils', unit: '¢/фунт', tickers: ['CBOT:ZL1!'], toUsdT: { kind: 'cents_lb' },
    expect: /soybean oil/i,
  },
  {
    id: 'dce_soyoil', name: 'Соевое масло', short: 'Соя DCE', venue: 'Dalian, основной контракт',
    group: 'softoils', unit: 'CNY/т', tickers: ['DCE:Y1!', 'DALIAN:Y1!'], toUsdT: { kind: 'fx_t', fx: 'USDCNY' }, sina: 'Y0',
    expect: /soy/i,
  },
  {
    id: 'zce_rapeoil', name: 'Рапсовое масло', short: 'Рапс. масло ZCE', venue: 'Zhengzhou, ближайший',
    group: 'softoils', unit: 'CNY/т', tickers: ['ZCE:OI1!'], toUsdT: { kind: 'fx_t', fx: 'USDCNY' },
    expect: /rapeseed oil/i,
  },
  {
    id: 'eco', name: 'Рапс (семена)', short: 'Рапс Euronext', venue: 'Euronext, ближайший',
    group: 'softoils', unit: 'EUR/т', tickers: ['EURONEXT:ECO1!'], toUsdT: { kind: 'eur_t' },
    expect: /rapeseed|colza/i,
  },
  {
    id: 'brent', name: 'Нефть Brent', short: 'Brent', venue: 'ICE, ближайший',
    group: 'energy', unit: 'USD/барр.', tickers: ['ICEEUR:BRN1!'], toUsdT: { kind: 'none' },
    expect: /brent/i, frontContract: brentFrontTicker,
  },
  {
    id: 'wti', name: 'Нефть WTI', short: 'WTI', venue: 'NYMEX, ближайший',
    group: 'energy', unit: 'USD/барр.', tickers: ['NYMEX:CL1!'], toUsdT: { kind: 'none' },
    expect: /crude/i,
  },
  {
    id: 'gasoil', name: 'Газойль', short: 'Газойль ICE', venue: 'ICE Low Sulphur Gasoil',
    group: 'energy', unit: 'USD/т',
    tickers: ['ICEEUR:G1!', 'ICEEUR:LGO1!', 'ICEEUR:GO1!', 'ICEEUR:GAS1!', 'ICEENDEX:G1!', 'ICE:G1!'],
    toUsdT: { kind: 'usd_t' },
    expect: /gas ?oil/i,
  },
  {
    id: 'ulsd', name: 'Дизель ULSD', short: 'ULSD', venue: 'NYMEX, NY Harbor',
    group: 'energy', unit: 'USD/галлон', tickers: ['NYMEX:HO1!'], toUsdT: { kind: 'usd_gal' },
    expect: /ulsd|heating/i,
  },
  {
    id: 'usdmyr', name: 'USD/MYR', short: 'USD/MYR', venue: 'Курс', group: 'fx', unit: 'MYR',
    tickers: ['FX_IDC:USDMYR'], toUsdT: { kind: 'none' },
  },
  {
    id: 'usdcny', name: 'USD/CNY', short: 'USD/CNY', venue: 'Курс', group: 'fx', unit: 'CNY',
    tickers: ['FX_IDC:USDCNY'], toUsdT: { kind: 'none' },
  },
  {
    id: 'eurusd', name: 'EUR/USD', short: 'EUR/USD', venue: 'Курс', group: 'fx', unit: 'USD',
    tickers: ['FX:EURUSD'], toUsdT: { kind: 'none' },
  },
];

export const GROUP_TITLES: Record<Group, string> = {
  palm: 'Пальмовое масло',
  softoils: 'Мягкие масла и рапс',
  energy: 'Энергоносители',
  fx: 'Валюты',
};

/** 1 т = 2204.62 фунта; цент/фунт → USD/т. */
export const CENTS_LB_TO_USD_T = 22.0462;
/** 1 т дизельного топлива ≈ 7.45 барр. × 42 галлона. */
export const GAL_PER_TONNE_DIESEL = 312.9;
