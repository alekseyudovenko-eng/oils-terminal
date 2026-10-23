// Проверка data/news.json перед коммитом: node scripts/validate-news.mjs
// Падает с кодом 1 и списком ошибок, если файл нарушает формат.
import { readFileSync } from 'node:fs';

const TOPICS = new Set(['palm', 'soy', 'sunflower', 'rapeseed', 'biofuel', 'policy', 'trade']);
const MAX_AGE_DAYS = 30;
const errors = [];
let data;
try {
  data = JSON.parse(readFileSync(new URL('../data/news.json', import.meta.url), 'utf8'));
} catch (e) {
  console.error('news.json не читается как JSON:', e.message);
  process.exit(1);
}

if (!Array.isArray(data.items)) errors.push('items должен быть массивом');
if (data.updatedAt !== null && isNaN(Date.parse(data.updatedAt))) errors.push('updatedAt — не дата');

const now = Date.now();
const ids = new Set(), urls = new Set();
for (const [i, n] of (data.items || []).entries()) {
  const at = `items[${i}] (${n.id || 'без id'})`;
  for (const f of ['id', 'title', 'summary', 'url', 'source', 'publishedAt', 'addedAt', 'lang']) {
    if (typeof n[f] !== 'string' || !n[f].trim()) errors.push(`${at}: нет поля ${f}`);
  }
  if (ids.has(n.id)) errors.push(`${at}: повтор id`);
  ids.add(n.id);
  if (!/^https:\/\//.test(n.url || '')) errors.push(`${at}: url должен начинаться с https://`);
  if (/news\.google\.com/.test(n.url || '')) errors.push(`${at}: ссылка на Google News вместо первоисточника`);
  if (urls.has(n.url)) errors.push(`${at}: повтор url`);
  urls.add(n.url);
  const pub = Date.parse(n.publishedAt);
  if (isNaN(pub)) errors.push(`${at}: publishedAt — не дата`);
  else {
    if (pub > now + 86400_000) errors.push(`${at}: дата публикации в будущем`);
    if (pub < now - (MAX_AGE_DAYS + 1) * 86400_000) errors.push(`${at}: старше ${MAX_AGE_DAYS} дней — удалите`);
  }
  if (isNaN(Date.parse(n.addedAt))) errors.push(`${at}: addedAt — не дата`);
  if (!['ru', 'en'].includes(n.lang)) errors.push(`${at}: lang должен быть ru или en`);
  if (!Array.isArray(n.topics) || n.topics.length === 0 || n.topics.some(t => !TOPICS.has(t))) {
    errors.push(`${at}: topics — непустой массив из ${[...TOPICS].join(', ')}`);
  }
  if (n.titleEn !== undefined && (typeof n.titleEn !== 'string' || !n.titleEn.trim() || n.titleEn.length > 100)) errors.push(`${at}: titleEn — непустая строка до 100 символов`);
  if (n.summaryEn !== undefined && (typeof n.summaryEn !== 'string' || !n.summaryEn.trim() || n.summaryEn.length > 400)) errors.push(`${at}: summaryEn — непустая строка до 400 символов`);
  for (const L of ['Uz', 'Kk', 'Ms']) {
    const tt = n[`title${L}`], ss = n[`summary${L}`];
    if (tt !== undefined && (typeof tt !== 'string' || !tt.trim() || tt.length > 140)) errors.push(`${at}: title${L} — непустая строка до 140 символов`);
    if (ss !== undefined && (typeof ss !== 'string' || !ss.trim() || ss.length > 500)) errors.push(`${at}: summary${L} — непустая строка до 500 символов`);
  }
  if ((n.summary || '').length > 400) errors.push(`${at}: summary длиннее 400 символов`);
  if (n.lang === 'en' && !n.originalTitle) errors.push(`${at}: для англоязычного источника нужен originalTitle`);
}

if (errors.length) {
  console.error(`news.json: ${errors.length} ошибок\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`news.json в порядке: ${data.items.length} новостей`);
