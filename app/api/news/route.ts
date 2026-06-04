import { NextResponse } from 'next/server';

// ЭТО ЖЕСТКАЯ ЗАГЛУШКА С ДАННЫМИ ИЗ ТВОЕГО XML
const MOCK_NEWS = [
  {
    title: "Russian sunflower oil exports to India increased by more than 70% in 2026",
    url: "https://www.apk-inform.com/en/news/1554774",
    content: "Russian sunflower oil exports to India increased by more than 70% in 2026",
    published_date: "Wed, 03 Jun 2026 17:48:08 GMT",
    source: "APK-Inform"
  },
  {
    title: "Kazakhstan oilseed processing sector posts record results – FOC 2026",
    url: "https://www.apk-inform.com/en/news/1554777",
    content: "Kazakhstan oilseed processing sector posts record results – to be discussed at FOC 2026: Fats and Oils Conference",
    published_date: "Wed, 03 Jun 2026 17:48:08 GMT",
    source: "APK-Inform"
  },
  {
    title: "Ukrzaliznytsia cuts rail exports of oilseed processing products",
    url: "https://www.apk-inform.com/en/news/1554766",
    content: "Ukrzaliznytsia cuts rail exports of oilseed processing products",
    published_date: "Wed, 03 Jun 2026 17:48:08 GMT",
    source: "APK-Inform"
  },
  {
    title: "Russian grain exports rose 1.6-fold in May– RGU",
    url: "https://www.apk-inform.com/en/news/1554786",
    content: "Russian grain exports rose 1.6-fold in May– RGU",
    published_date: "Wed, 03 Jun 2026 17:48:08 GMT",
    source: "APK-Inform"
  },
  {
    title: "Ukraine’s agri export road shipments remained steady in May",
    url: "https://www.apk-inform.com/en/news/1554778",
    content: "Ukraine’s agri export road shipments remained steady in May",
    published_date: "Wed, 03 Jun 2026 17:48:08 GMT",
    source: "APK-Inform"
  },
  {
    title: "Feed corn prices in Ukraine continue to decline",
    url: "https://www.apk-inform.com/en/news/1554775",
    content: "Feed corn prices in Ukraine continue to decline",
    published_date: "Wed, 03 Jun 2026 17:48:08 GMT",
    source: "APK-Inform"
  }
];

export async function GET() {
  // Возвращаем заглушку без каких-либо запросов в интернет
  return NextResponse.json({ news: MOCK_NEWS });
}
