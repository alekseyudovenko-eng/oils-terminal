import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  await supabaseAdmin.from('market_data').insert({
    commodity: 'Soybean Oil (Test)',
    metric: 'price_spot',
    value: 1245.50,
    status: 'verified',
    confidence_score: 0.9,
    sources: [{ source: 'manual_test' }],
    verified_at: new Date().toISOString()
  });
  return NextResponse.json({ success: true });
}