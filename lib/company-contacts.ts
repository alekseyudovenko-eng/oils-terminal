// lib/company-contacts.ts — официальные контакты компаний-импортёров для /lab/importers.
// Хранятся в Supabase (company_contacts), а не в публичном репозитории.
// Только то, что компании публикуют сами: общий телефон, почта, отдел закупок, адрес,
// страница в LinkedIn и публично названные руководители со ссылкой на источник.
import { unstable_cache } from 'next/cache';
import { getDb } from './db';
import { rethrowIfNextInternal } from './next-errors';

import type { CompanyContact } from './company-contacts-shared';
export type { CompanyContact, ContactPerson } from './company-contacts-shared';

async function load(): Promise<Record<string, CompanyContact>> {
  const db = getDb();
  if (!db) return {};
  const { data, error } = await db.from('company_contacts')
    .select('country,company,search_name,phone,email,procurement,address,linkedin_url,people,sources,checked_at')
    .limit(5000);
  if (error) throw new Error(error.message);
  const out: Record<string, CompanyContact> = {};
  for (const r of (data || []) as any[]) {
    out[`${r.country}|${r.company}`] = {
      searchName: r.search_name, phone: r.phone, email: r.email, procurement: r.procurement,
      address: r.address, linkedinUrl: r.linkedin_url,
      people: Array.isArray(r.people) ? r.people : [], sources: r.sources ?? [], checkedAt: r.checked_at,
    };
  }
  return out;
}

const cached = unstable_cache(load, ['company-contacts-v1'], { revalidate: 3600, tags: ['company-contacts'] });

export async function getCompanyContacts(): Promise<Record<string, CompanyContact>> {
  try { return await cached(); }
  catch (e) { rethrowIfNextInternal(e); console.error('getCompanyContacts:', e); return {}; }
}
