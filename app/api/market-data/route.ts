import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('market_data')
    .select('*')
    .order('verified_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Фильтруем дубликаты, оставляя свежие
  const latest = data?.reduce((acc: any, current: any) => {
    const existing = acc.find((item: any) => item.commodity === current.commodity);
    if (!existing) acc.push(current);
    return acc;
  }, []) || [];

  return NextResponse.json(latest);
}
