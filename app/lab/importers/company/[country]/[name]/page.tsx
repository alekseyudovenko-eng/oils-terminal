// /lab/importers/company/[country]/[name] — страница компании со всеми контактами (закрыта паролем, как весь /lab).
import type { Metadata } from 'next';
import Link from 'next/link';
import LabHeader from '@/components/LabHeader';
import { IMPORTERS } from '@/lib/importers';
import { getCompanyContact } from '@/lib/company-contacts';
import { linkedinLinks } from '@/lib/company-contacts-shared';
import { getDict } from '@/lib/i18n-server';
import { getLabDict } from '@/lib/lab-i18n';
import { localizeImporters } from '@/lib/importers-i18n';
import { INTL, type Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const T = {
  ru: { back: '← Импортёры', all: 'Все контакты', phone: 'Телефоны', email: 'Почта', procurement: 'Закупки', address: 'Адрес', people: 'Люди', role: 'Должность и контакты', src: 'источник', sources: 'Источники', checked: 'проверено', none: 'По этой компании контактов в базе пока нет.', profile: 'Профиль', segment: 'Сегмент', products: 'Масла и жиры', volume: 'Объём', notes: 'Заметки', site: 'Сайт', li: 'Поиск в LinkedIn', liCompany: 'компания', liProcurement: 'закупки', liRnd: 'технологи и R&D', liManagement: 'руководство', unknown: 'Страна не определена' },
  en: { back: '← Importers', all: 'All contacts', phone: 'Phones', email: 'Email', procurement: 'Purchasing', address: 'Address', people: 'People', role: 'Role and contacts', src: 'source', sources: 'Sources', checked: 'checked', none: 'No contacts for this company in the database yet.', profile: 'Profile', segment: 'Segment', products: 'Oils and fats', volume: 'Volume', notes: 'Notes', site: 'Website', li: 'LinkedIn search', liCompany: 'company', liProcurement: 'purchasing', liRnd: 'R&D and technologists', liManagement: 'management', unknown: 'Country not set' },
};
const tx = (l: Locale) => (l === 'ru' ? T.ru : T.en);

const countryLabel = (code: string, lang: Locale, unknown: string) => {
  if (code === 'xx') return unknown;
  try { return new Intl.DisplayNames([INTL[lang]], { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase(); }
  catch { return code.toUpperCase(); }
};

type Params = { params: { country: string; name: string } };
const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export function generateMetadata({ params }: Params): Metadata {
  return { title: `${dec(params.name)} · ${getDict().t.lab.title}`, robots: { index: false, follow: false } };
}

const list = (v?: string | null) => (v ?? '').split(/;\s*/).map(x => x.trim()).filter(Boolean);
const linkCls = 'underline decoration-rule underline-offset-4 hover:text-gold';

export default async function CompanyPage({ params }: Params) {
  const country = dec(params.country).toLowerCase();
  const name = dec(params.name);
  const { lang, L } = getLabDict();
  const s = tx(lang);
  const c = await getCompanyContact(country, name);

  // Профиль из базы импортёров (если компания там есть)
  const raw = IMPORTERS.countries.find(x => x.id === country);
  const idx = raw ? raw.companies.findIndex(co => co.name === name) : -1;
  const loc = raw ? localizeImporters(IMPORTERS.countries, lang, L.imp.notes).countries.find(x => x.id === country) : undefined;
  const co = idx >= 0 ? loc?.companies[idx] : undefined;

  const li = linkedinLinks(name, c);
  const phones = list(c?.phone);
  const emails = list(c?.email);
  const checked = c?.checkedAt ? new Date(c.checkedAt).toLocaleDateString(INTL[lang], { timeZone: 'UTC' }) : null;

  return (
    <>
      <LabHeader current="/lab/importers" note={getDict().t.lab.notes.importers} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <p className="pt-6 text-sm flex gap-4">
          <Link href="/lab/importers" className={linkCls}>{s.back}</Link>
          <Link href="/lab/importers/contacts" className={linkCls}>{s.all}</Link>
        </p>
        <h1 className="mt-3 font-cond text-3xl sm:text-4xl font-semibold tracking-tight break-words">{name}</h1>
        <p className="mt-1 text-ink-3 text-sm">
          {[countryLabel(country, lang, s.unknown), co?.group, co?.city].filter(Boolean).join(' · ')}
          {co?.website && <> · <a href={co.website} target="_blank" rel="noopener noreferrer" className={linkCls}>{co.website.replace(/^https?:\/\/(www\.)?/, '')}</a></>}
        </p>

        {!c && <p className="mt-8 text-ink-2">{s.none}</p>}

        {c && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-labelledby="people-title">
              <h2 id="people-title" className="font-cond text-2xl font-semibold mb-3">{s.people} <span className="num text-ink-3 text-base">{c.people.length}</span></h2>
              {c.people.length === 0 ? <p className="text-ink-3 text-sm">—</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-ink-3 border-b border-rule text-left">
                      <th scope="col" className="py-2 pr-4 font-normal w-[34%]">{s.people}</th>
                      <th scope="col" className="py-2 font-normal">{s.role}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-rule">
                      {c.people.map((p, i) => (
                        <tr key={`${p.name}-${i}`} className="align-top">
                          <th scope="row" className="py-2 pr-4 text-left font-medium text-ink">{p.name}</th>
                          <td className="py-2 text-ink-2 break-words">
                            {p.role}
                            {p.source && /^https?:/.test(p.source) && <> · <a href={p.source} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.src}</a></>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <aside className="space-y-6 text-sm">
              <section aria-label={s.phone} className="space-y-4">
                {phones.length > 0 && <div><h3 className="text-xs text-ink-3 mb-1">{s.phone}</h3>
                  {phones.map(p => <div key={p}><a href={`tel:${p.replace(/[^+\d]/g, '')}`} className={linkCls}>{p}</a></div>)}</div>}
                {emails.length > 0 && <div><h3 className="text-xs text-ink-3 mb-1">{s.email}</h3>
                  {emails.map(e => <div key={e} className="break-all"><a href={`mailto:${e}`} className={linkCls}>{e}</a></div>)}</div>}
                {c.procurement && <div><h3 className="text-xs text-ink-3 mb-1">{s.procurement}</h3><p className="text-ink-2 break-words">{c.procurement}</p></div>}
                {c.address && <div><h3 className="text-xs text-ink-3 mb-1">{s.address}</h3><p className="text-ink-2 break-words">{c.address}</p></div>}
              </section>
              <section aria-label={s.li}>
                <h3 className="text-xs text-ink-3 mb-1">{s.li}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <a href={li.company} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.liCompany}</a>
                  <a href={li.procurement} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.liProcurement}</a>
                  <a href={li.rnd} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.liRnd}</a>
                  <a href={li.management} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.liManagement}</a>
                </div>
              </section>
              {co && (
                <section aria-label={s.profile}>
                  <h3 className="text-xs text-ink-3 mb-1">{s.profile}</h3>
                  <dl className="space-y-1 text-ink-2">
                    {co.segment.length > 0 && <div><dt className="inline text-ink-3">{s.segment}: </dt><dd className="inline">{co.segment.join(', ')}</dd></div>}
                    {co.products.length > 0 && <div><dt className="inline text-ink-3">{s.products}: </dt><dd className="inline">{co.products.join(', ')}</dd></div>}
                    {co.volume && <div><dt className="inline text-ink-3">{s.volume}: </dt><dd className="inline">{co.volume}</dd></div>}
                    {co.notes && <div><dt className="inline text-ink-3">{s.notes}: </dt><dd className="inline">{co.notes}</dd></div>}
                  </dl>
                </section>
              )}
              {(c.sources.length > 0 || checked) && (
                <section aria-label={s.sources} className="text-xs text-ink-3">
                  <h3 className="mb-1">{s.sources}{checked && ` · ${s.checked} ${checked}`}</h3>
                  <ul className="space-y-0.5 break-all">
                    {c.sources.map(u => <li key={u}>{/^https?:/.test(u) ? <a href={u} target="_blank" rel="noopener noreferrer" className={linkCls}>{u.replace(/^https?:\/\/(www\.)?/, '')}</a> : u}</li>)}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
