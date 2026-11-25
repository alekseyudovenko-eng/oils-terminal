// /lab/importers/contacts — каталог всех контактов из Supabase (закрыт паролем, как весь /lab).
import type { Metadata } from 'next';
import Link from 'next/link';
import LabHeader from '@/components/LabHeader';
import ContactsDirectory from '@/components/ContactsDirectory';
import { getContactIndex } from '@/lib/company-contacts';
import { getDict } from '@/lib/i18n-server';
import { getLabDict } from '@/lib/lab-i18n';
import { INTL } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: `Контакты · ${getDict().t.lab.title}`, robots: { index: false, follow: false } };
}

export default async function ContactsPage() {
  const { lang } = getLabDict();
  const ru = lang === 'ru';
  const rows = await getContactIndex();
  const codes = Array.from(new Set(rows.map(r => r.c)));
  const name = (code: string) => {
    if (code === 'xx') return ru ? 'Страна не определена' : 'Country not set';
    try { return new Intl.DisplayNames([INTL[lang]], { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase(); } catch { return code.toUpperCase(); }
  };
  const countries = codes.map(code => ({ code, label: name(code) })).sort((a, b) => a.label.localeCompare(b.label, INTL[lang]));
  return (
    <>
      <LabHeader current="/lab/importers" note={getDict().t.lab.notes.importers} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <p className="pt-6 text-sm"><Link href="/lab/importers" className="underline decoration-rule underline-offset-4 hover:text-gold">{ru ? '← Импортёры' : '← Importers'}</Link></p>
        <h1 className="mt-3 font-cond text-3xl sm:text-4xl font-semibold tracking-tight">{ru ? 'Контакты' : 'Contacts'}</h1>
        <p className="mt-2 mb-6 text-ink-2 max-w-[70ch]">
          {ru ? 'Все компании из базы контактов. Нажмите на компанию, чтобы увидеть людей, телефоны, почту и источники.' : 'All companies in the contacts database. Open a company to see people, phones, emails and sources.'}
        </p>
        <ContactsDirectory rows={rows} countries={countries} ru={ru} />
      </main>
    </>
  );
}
