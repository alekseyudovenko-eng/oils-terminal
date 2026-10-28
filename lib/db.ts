// lib/db.ts — подключение к Supabase (только на сервере, ключ service role).
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Возвращает клиента или null, если переменные окружения не заданы (страницы тогда работают без базы). */
export function getDb(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

let freshClient: SupabaseClient | null = null;

/**
 * Клиент без кэша Next.js: каждый запрос идёт в базу (cache: 'no-store').
 * Нужен для отметок «уже отправлено» — иначе Next может отдать старый ответ из кэша,
 * рассылка не увидит утреннюю отметку и уйдёт второй раз.
 */
export function getFreshDb(): SupabaseClient | null {
  if (freshClient) return freshClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  freshClient = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  return freshClient;
}
