// lib/dict-quick.ts — тексты быстрых карточек и интерактивного графика на странице «Рынок».
import type { Locale } from './i18n';

export const QUICK: Record<Locale, { cardsTitle: string; chartsTitle: string; chartsNote: string; anchor: string; open: string; days30: string }> = {
  ru: { cardsTitle: 'Быстрый обзор', chartsTitle: 'Графики цен', chartsNote: 'Выберите инструмент и период. Наведите курсор на график, чтобы увидеть цену за день.', anchor: 'Графики', open: 'Открыть график', days30: '30 дней' },
  en: { cardsTitle: 'Quick view', chartsTitle: 'Price charts', chartsNote: 'Pick an instrument and a period. Hover over the chart to see the daily price.', anchor: 'Charts', open: 'Open chart', days30: '30 days' },
  uz: { cardsTitle: 'Tezkor koʻrinish', chartsTitle: 'Narx grafiklari', chartsNote: 'Asbob va davrni tanlang. Kunlik narxni koʻrish uchun grafik ustiga olib boring.', anchor: 'Grafiklar', open: 'Grafikni ochish', days30: '30 kun' },
  kk: { cardsTitle: 'Жылдам шолу', chartsTitle: 'Баға графиктері', chartsNote: 'Құралды және кезеңді таңдаңыз. Күндік бағаны көру үшін графикке меңзерді апарыңыз.', anchor: 'Графиктер', open: 'Графикті ашу', days30: '30 күн' },
  ms: { cardsTitle: 'Paparan pantas', chartsTitle: 'Carta harga', chartsNote: 'Pilih instrumen dan tempoh. Halakan tetikus pada carta untuk melihat harga harian.', anchor: 'Carta', open: 'Buka carta', days30: '30 hari' },
};
