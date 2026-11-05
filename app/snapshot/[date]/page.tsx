// /snapshot/2026-11-05 — страница «IMA Daily Snapshot» за день. Нужна для превью ссылок (og:image),
// например во ВКонтакте, где ключ сообщества не может загружать картинки на стену.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const ru = (d: string) => d.split('-').reverse().join('.');

export function generateMetadata({ params }: { params: { date: string } }): Metadata {
  if (!valid(params.date)) return {};
  const title = `IMA Daily Snapshot · ${ru(params.date)}`;
  const description = 'Цены на пальмовое масло (FCPO), нефть Brent/WTI, курс USD/MYR и главные новости рынка растительных масел.';
  const image = `/api/snapshot?d=${params.date}`;
  return {
    title, description,
    openGraph: { title, description, type: 'article', images: [{ url: image, width: 1080, height: 1350, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots: { index: false },
  };
}

export default function SnapshotPage({ params }: { params: { date: string } }) {
  if (!valid(params.date)) notFound();
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>IMA Daily Snapshot · {ru(params.date)}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/snapshot?d=${params.date}`} alt={`IMA Daily Snapshot ${ru(params.date)}`} style={{ width: '100%', height: 'auto', borderRadius: 8 }} />
      <p style={{ marginTop: 16 }}><a href="/market">Цены и новости рынка →</a></p>
    </main>
  );
}
