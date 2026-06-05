import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio'; // Убедись, что cheerio есть в package.json

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Функция для получения цены сои (Yahoo Finance)
async function getSoybeanOilPrice() {
  try {
    // Используем Yahoo Finance через их API или парсинг
    // Для простоты оставим твой рабочий метод или используем надежный источник
    // Здесь пример с Yahoo Finance (ZL=F - Soybean Oil Futures)
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/ZL=F?region=US&lang=en-US&includePrePost=false&interval=1d&range=1d', {
      next: { revalidate: 3600 }
    });
    const data = await res.json();
    const price = data.chart.result[0].meta.regularMarketPrice;
    
    // Конвертация: Цена в центах за фунт -> USD за MT
    // 1 цент/фунт = 22.0462 USD/MT
    if (price) return (price * 22.0462).toFixed(2);
  } catch (e) { console.error("Soy Error", e); }
  return null;
}

// Функция для получения CPO Futures с Bursa Malaysia
async function getCPOFuturesPrice() {
  try {
    // Парсим страницу Bursa Malaysia
    const res = await fetch('https://www.bursamalaysia.com/market_information/derivatives_prices', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Ищем цену FCPO (Crude Palm Oil Futures)
    // Внимание: селекторы могут меняться, нужно проверить актуальные классы на сайте
    // Обычно цена лежит в таблице с id или классом .derivative-price
    let priceMYR = null;
    
    // Примерный поиск по тексту "FCPO" или "Crude Palm Oil"
    $('table tr').each((i, elem) => {
      const text = $(elem).text();
      if (text.includes('FCPO') || text.includes('Crude Palm Oil')) {
        // Пытаемся найти числовое значение цены
        const priceMatch = text.match(/(\d{3,4}\.\d{2})/);
        if (priceMatch) priceMYR = parseFloat(priceMatch[1]);
      }
    });

    if (priceMYR) {
      // Конвертация MYR в USD (курс примерно 4.7, лучше брать актуальный, но пока жестко или через API)
      // Для точности можно добавить запрос курса валют
      const usdRate = 0.22; // Примерно 1 MYR = 0.22 USD (проверить актуальный)
      return (priceMYR * usdRate).toFixed(2);
    }
  } catch (e) { console.error("Bursa Error", e); }
  return null;
}

// Функция для получения официальной цены Индонезии из БД
async function getIndonesiaReferencePrice() {
  const { data, error } = await supabase
    .from('indonesia_official_rates')
    .select('reference_price_usd')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.reference_price_usd.toString();
}

export async function GET() {
  try {
    // 1. Собираем данные
    const soyPrice = await getSoybeanOilPrice();
    const cpoFutures = await getCPOFuturesPrice();
    const indoRefPrice = await getIndonesiaReferencePrice();

    // 2. Сохраняем в основную таблицу market_data
    const updates = [];

    if (soyPrice) {
      updates.push({
        commodity: 'Soybean Oil CBOT (Chicago)',
        value: soyPrice,
        currency: 'USD',
        unit: 'MT',
        metric: 'price_spot',
        updated_at: new Date().toISOString()
      });
    }

    if (cpoFutures) {
      updates.push({
        commodity: 'CPO Futures (Bursa Malaysia)',
        value: cpoFutures,
        currency: 'USD',
        unit: 'MT',
        metric: 'price_futures',
        updated_at: new Date().toISOString()
      });
    }

    if (indoRefPrice) {
      updates.push({
        commodity: 'CPO Reference Price (Indonesia)',
        value: indoRefPrice,
        currency: 'USD',
        unit: 'MT',
        metric: 'price_reference',
        updated_at: new Date().toISOString()
      });
    }

    // 3. Записываем в базу (upsert)
    for (const item of updates) {
      await supabase
        .from('market_data')
        .upsert(item, { onConflict: 'commodity' });
    }

    return NextResponse.json({ 
      success: true, 
      updated: updates.length,
      data: updates 
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
