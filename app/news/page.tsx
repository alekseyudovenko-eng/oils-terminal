"use client";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        if (data.news) {
          setNews(data.news);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  return (
    <Layout title="Market News & Analytics">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Global Market News</h1>
          <p className="text-slate-500 mt-1">Strictly verified sources (Fastmarkets, USDA, MPOB, IKAR, etc.)</p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">
            Last 7 Days Only
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 animate-pulse">Scanning global agencies...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.length > 0 ? (
            news.map((item, idx) => (
              <a 
                key={idx} 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-6 bg-white border border-slate-200 rounded-sm hover:shadow-md hover:border-blue-400 transition group relative overflow-hidden"
              >
                {/* Индикатор свежести */}
                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-bl-sm"></div>
                
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate max-w-[70%] bg-slate-100 px-2 py-1 rounded">
                    {item.source}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(item.published_date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-700 leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {item.content || "Click to read full analysis at source..."}
                </p>
              </a>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-sm border border-dashed border-slate-300">
              <p className="text-slate-500 font-medium">No significant news found in the last 7 days.</p>
              <p className="text-xs text-slate-400 mt-2">Markets are quiet or sources have not published updates.</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
