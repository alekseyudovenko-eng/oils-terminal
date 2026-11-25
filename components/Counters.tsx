'use client';
// Счётчики посещений: Vercel Web Analytics (без cookie) Meta Pixel (если задан NEXT_PUBLIC_FB_PIXEL_ID) и Яндекс Метрика (если задан NEXT_PUBLIC_YM_ID).
// Раздел /lab не считаем.
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';

export default function Counters() {
  const ym = (process.env.NEXT_PUBLIC_YM_ID || '').replace(/\D/g, '');
  const fb = (process.env.NEXT_PUBLIC_FB_PIXEL_ID || '').replace(/\D/g, '');
  return (
    <>
      <Analytics beforeSend={e => (new URL(e.url).pathname.startsWith('/lab') ? null : e)} />
      {fb && (
        <>
          <Script id="fb-pixel" strategy="afterInteractive">{`
            if (!location.pathname.startsWith('/lab')) {
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${fb}');
              fbq('track', 'PageView');
            }
          `}</Script>
          <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${fb}&ev=PageView&noscript=1`} /></noscript>
        </>
      )}
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
