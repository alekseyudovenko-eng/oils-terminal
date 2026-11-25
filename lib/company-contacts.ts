// lib/company-contacts.ts — контакты компаний из Supabase (public.company_contacts), только на сервере.
import { unstable_cache } from 'next/cache';
import { getDb } from './db';
import { rethrowIfNextInternal } from './next-errors';

import type { CompanyContact } from './company-contacts-shared';
export type { CompanyContact, ContactPerson } from './company-contacts-shared';

/** Строка каталога: без тяжёлых полей, чтобы список из тысяч компаний помещался в кэш. */
export type ContactIndexRow = { c: string; n: string; ph: boolean; em: boolean; p: number; pn: string };

const PAGE = 1000; // лимит PostgREST на один ответ

async function loadIndex(): Promise<ContactIndexRow[]> {
  const db = getDb();
  if (!db) return [];
  const out: ContactIndexRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('company_contacts')
      .select('country,company,phone,email,people')
      .order('country').order('company')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const r of (data || []) as any[]) {
      out.push({ c: r.country, n: r.company, ph: !!r.phone, em: !!r.email, p: Array.isArray(r.people) ? r.people.length : 0,
        pn: Array.isArray(r.people) ? r.people.map((x: any) => String(x?.name ?? '')).join(' ').toLowerCase().slice(0, 400) : '' });
    }
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const cachedIndex = unstable_cache(loadIndex, ['company-contacts-index-v1'], { revalidate: 600, tags: ['company-contacts'] });

/** Все компании, по которым есть запись в базе контактов (для каталога и ссылок в таблице). */
export async function getContactIndex(): Promise<ContactIndexRow[]> {
  try { return await cachedIndex(); }
  catch (e) { rethrowIfNextInternal(e); console.error('getContactIndex:', e); return []; }
}

/** Полная запись одной компании. */
export async function getCompanyContact(country: string, company: string): Promise<CompanyContact | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const { data, error } = await db.from('company_contacts')
      .select('search_name,phone,email,procurement,address,linkedin_url,people,sources,checked_at')
      .eq('country', country).eq('company', company).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const r = data as any;
    return {
      searchName: r.search_name, phone: r.phone, email: r.email, procurement: r.procurement,
      address: r.address, linkedinUrl: r.linkedin_url,
      people: Array.isArray(r.people) ? r.people : [], sources: r.sources ?? [], checkedAt: r.checked_at,
    };
  } catch (e) { rethrowIfNextInternal(e); console.error('getCompanyContact:', e); return null; }
}

export const companyHref = (country: string, company: string) =>
  `/lab/importers/company/${encodeURIComponent(country)}/${encodeURIComponent(company)}`;
