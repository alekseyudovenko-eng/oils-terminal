"use client";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout"; // Предполагаем, что у тебя есть Layout

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Global Market News</h1>
        <p className="text-slate-500 mt-1">Aggregated from USDA, MPOB, Fastmarkets, Argus, IKAR and other key sources (Last 7 Days)</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Scanning global agencies...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.length > 0 ? (
            news.map((item, idx) => (
              <a 
                key={idx} 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-6 bg-white border border-slate-200 rounded-sm hover:shadow-md hover:border-slate-400 transition group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider truncate max-w-[70%]">
                    {item.source || "Agency"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(item.published_date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-700">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-3">
                  {item.content || "Click to read full analysis..."}
                </p>
              </a>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-slate-500">
              No significant news found in the last 7 days from verified sources.
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
