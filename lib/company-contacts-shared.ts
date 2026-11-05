// lib/company-contacts-shared.ts — типы и ссылки на поиск LinkedIn (без обращения к базе; можно в клиентских компонентах).

export type ContactPerson = { name: string; role: string; source?: string };
export type CompanyContact = {
  searchName?: string | null;
  phone?: string | null;
  email?: string | null;
  procurement?: string | null;
  address?: string | null;
  linkedinUrl?: string | null;
  people: ContactPerson[];
  sources: string[];
  checkedAt?: string | null;
};

/** Имя для поиска в LinkedIn: латинское, если задано, иначе название без кавычек и «ГК», «ООО»… */
export function linkedinName(company: string, c?: CompanyContact | null): string {
  if (c?.searchName) return c.searchName;
  return company
    .replace(/[«»"“”„]/g, '')
    .replace(/^(ГК|ООО|ОАО|АО|ПАО|ТОО|АҚ|ЖШС|СП|ЧП|ИП|SRL|S\.R\.L\.|SA|S\.A\.)\s+/i, '')
    .trim();
}

const LI = 'https://www.linkedin.com/search/results';
/** Ссылки на поиск LinkedIn: открываются в браузере пользователя под его аккаунтом. */
export function linkedinLinks(company: string, c?: CompanyContact | null) {
  const n = linkedinName(company, c);
  const people = (q: string) => `${LI}/people/?keywords=${encodeURIComponent(`${n} ${q}`.trim())}`;
  return {
    company: c?.linkedinUrl || `${LI}/companies/?keywords=${encodeURIComponent(n)}`,
    procurement: people('procurement OR purchasing OR buyer'),
    rnd: people('R&D OR technologist OR quality'),
    management: people('CEO OR director OR "general manager"'),
    all: people(''),
  };
}
