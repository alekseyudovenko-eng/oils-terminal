import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Функция для получения цены сои (Yahoo Finance)
async function getSoybeanOilPrice() {
  try {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/ZL=F?region=US&lang=en-US&includePrePost=false&interval=1d&range=1d', {
      next: { revalidate: 3600 }
    });
    const data = await res.json();
    const price = data.chart.result[0].meta.regularMarketPrice;
    if (price) return (price * 22.0462).toFixed(2); // cents/lb -> USD/MT
  } catch (e) { console.error("Soy Error", e); }
  return null;
}

// Функция для получения CPO Futures с Bursa Malaysia (БЕЗ CHEERIO - Чистый RegExp)
async function getCPOFuturesPrice() {
  try {
    const res = await fetch('https://www.bursamalaysia.com/market_information/derivatives_prices', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }
    });
    const html = await res.text();
    
    // Ищем цену рядом с текстом "FCPO"
    const fcpoIndex = html.indexOf('FCPO');
    if (fcpoIndex !== -1) {
      const snippet = html.substring(fcpoIndex, fcpoIndex + 500);
      // Ищем число в формате 0000.00
      const priceMatch = snippet.match(/(\d{3,4}\.\d{2})/);
      if (priceMatch) {
        const priceMYR = parseFloat(priceMatch[1]);
        // Конвертация MYR -> USD (курс ~4.7)
        const usdRate = 0.212; 
        return (priceMYR * usdRate).toFixed(2);
      }
    }
  } catch (e) { console.error("Bursa Error", e); }
  return null;
}

// Функция для получения официальной цены Индонезии из БД
async function getIndonesiaReferencePrice() {
  try {
    const { data, error } = await supabase
      .from('indonesia_official_rates')
      .select('reference_price_usd')
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.reference_price_usd.toString();
  } catch (e) {
    console.error("Indo DB Error", e);
    return null;
  }
}

export async function GET() {
  try {
    const soyPrice = await getSoybeanOilPrice();
    const cpoFutures = await getCPOFuturesPrice();
    const indoRefPrice = await getIndonesiaReferencePrice();

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
