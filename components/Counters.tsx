'use client';
// Счётчики посещений: Vercel Web Analytics (без cookie) и, если задан NEXT_PUBLIC_YM_ID, Яндекс Метрика.
// Раздел /lab не считаем.
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';

export default function Counters() {
  const ym = (process.env.NEXT_PUBLIC_YM_ID || '').replace(/\D/g, '');
  return (
    <>
      <Analytics beforeSend={e => (new URL(e.url).pathname.startsWith('/lab') ? null : e)} />
      {ym && (
        <>
          <Script id="ym" strategy="afterInteractive">{`
            if (!location.pathname.startsWith('/lab')) {
              (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
              ym(${ym}, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
            }
          `}</Script>
          <noscript><div><img src={`https://mc.yandex.ru/watch/${ym}`} style={{ position: 'absolute', left: '-9999px' }} alt="" /></div></noscript>
        </>
      )}
    </>
  );
}
