import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const supabase = createClient(url, key);

  await supabase.from('market_data').insert({
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
