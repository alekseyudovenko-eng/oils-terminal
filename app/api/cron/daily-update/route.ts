import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

  try {
    // Ищем цену за метрическую тонну
    const response = await tvly.search("soybean oil price per metric ton USD today", {
      searchDepth: "advanced", 
      includeAnswer: true, 
      maxResults: 3
    });

    let price = 0;
    const textToSearch = response.answer + " " + JSON.stringify(response.results);

    // Ищем числа в формате цены (например, 1250.50 или 1,250.00)
    const priceRegex = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s?(?:USD|per ton)/i;
    const match = textToSearch.match(priceRegex);

    if (match && match[1]) {
      price =
