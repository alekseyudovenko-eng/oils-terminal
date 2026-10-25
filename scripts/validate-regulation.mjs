// scripts/validate-regulation.mjs — проверка data/regulation.json перед коммитом.
// Запуск: node scripts/validate-regulation.mjs  (код выхода 1 при ошибках)
import { readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync(new URL('../data/regulation.json', import.meta.url), 'utf8'));
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const COUNTRIES = ['PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'EE', 'LV', 'LT', 'HR', 'BY', 'MD', 'UA', 'RU', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'AM'];
const BLOC = ['EU', 'EAEU', 'other'];
const USE = ['high', 'medium', 'low', 'none', 'nodata'];
const STATUS = ['in_force', 'upcoming', 'proposal'];
const TYPE = ['disclosure', 'claims', 'ban', 'dairy', 'import', 'traceability', 'tax', 'standard', 'sustainability'];
const LANGS5 = ['ru', 'en', 'uz', 'kk', 'ms'];

const str = (v) => typeof v === 'string' && v.trim().length > 0;
const l2 = (where, v, max) => {
  for (const l of ['ru', 'en']) {
    if (!str(v?.[l])) err(where, `нет текста ${l}`);
    else if (max && v[l].length > max) err(where, `${l} длиннее ${max} символов (${v[l].length})`);
  }
};

if (!/^\d{4}-\d{2}-\d{2}$/.test(d.updatedAt ?? '')) err('updatedAt', 'нужна дата YYYY-MM-DD');
l2('period', d.period, 120);

// Страны
const codes = new Set();
for (const [i, c] of (d.countries ?? []).entries()) {
  const w = `countries[${i}] ${c.code ?? '?'}`;
  if (!COUNTRIES.includes(c.code)) err(w, 'код страны не из списка 20 стран');
  if (codes.has(c.code)) err(w, 'страна повторяется');
  codes.add(c.code);
  if (!BLOC.includes(c.bloc)) err(w, `bloc: ${BLOC.join('/')}`);
  if (!USE.includes(c.claimUse)) err(w, `claimUse: ${USE.join('/')}`);
  for (const l of LANGS5) if (!str(c.name?.[l])) err(w, `нет name.${l}`);
  if (typeof c.claimPhrase !== 'string') err(w, 'нет claimPhrase (может быть пустой строкой)');
  l2(`${w}.practice`, c.practice, 400);
  l2(`${w}.summary`, c.summary, 400);
}
for (const c of COUNTRIES) if (!codes.has(c)) err('countries', `нет страны ${c}`);

// Нормы
const ids = new Set();
for (const [i, m] of (d.measures ?? []).entries()) {
  const w = `measures[${i}] ${m.id ?? '?'}`;
  if (!/^[a-z0-9-]+$/.test(m.id ?? '')) err(w, 'id: латиница, цифры, дефис');
  if (ids.has(m.id)) err(w, 'id повторяется');
  ids.add(m.id);
  if (!(['EU', 'EAEU'].includes(m.scope) || COUNTRIES.includes(m.scope))) err(w, 'scope: EU, EAEU или код страны');
  if (!TYPE.includes(m.type)) err(w, `type: ${TYPE.join('/')}`);
  if (!STATUS.includes(m.status)) err(w, `status: ${STATUS.join('/')}`);
  if (!/^(\d{4}(-\d{2}(-\d{2})?)?)?$/.test(m.date ?? 'x')) err(w, 'date: "", YYYY, YYYY-MM или YYYY-MM-DD');
  if (!/^https?:\/\/\S+$/.test(m.url ?? '')) err(w, 'url: прямая ссылка на источник');
  l2(`${w}.act`, m.act, 160);
  l2(`${w}.title`, m.title, 120);
  l2(`${w}.text`, m.text, 600);
}

if (errors.length) {
  console.error(`regulation.json: ошибок ${errors.length}`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log(`regulation.json OK: ${codes.size} стран, ${ids.size} норм, обновлено ${d.updatedAt}`);
