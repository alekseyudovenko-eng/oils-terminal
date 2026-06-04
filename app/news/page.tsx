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
  const [filter, setFilter] = useState<"all" | "ru" | "en">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        if (data.news) setNews(data.news);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    }
    fetchNews();
  }, []);

  const filteredNews = news.filter(item => {
    if (filter === "all") return true;
    // Простая эвристика: если источник содержит RU или заголовок кириллицей
    if (filter === "ru") return item.source.includes('RU') || /[а-яА-Я]/.test(item.title);
    if (filter === "en") return !/[а-яА-Я]/.test(item.title);
    return true;
  });

  return (
    <Layout title="Global News Feed">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Market News</h1>
          <p className="text-slate-500 mt-1">Palm, Soy, Sunflower, Rapeseed & Coconut</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-sm">
          <button onClick={() => setFilter("all")} className={`px-3 py-1 text-xs font-bold rounded ${filter === 'all' ? 'bg-white shadow' : ''}`}>ALL</button>
          <button onClick={() => setFilter("ru")} className={`px-3 py-1 text-xs font-bold rounded ${filter === 'ru' ? 'bg-white shadow' : ''}`}>RU</button>
          <button onClick={() => setFilter("en")} className={`px-3 py-1 text-xs font-bold rounded ${filter === 'en' ? 'bg-white shadow' : ''}`}>EN</button>
        </div>
      </div>

      {loading ? <div className="text-center py-10">Loading...</div> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredNews.map((item, idx) => (
            <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer"
              className="block p-6 bg-white border border-slate-200 rounded-sm hover:shadow-md transition group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase">{item.source}</span>
                <span className="text-xs text-slate-400">{new Date(item.published_date).toLocaleDateString()}</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-700">{item.title}</h3>
              <p className="text-sm text-slate-600 line-clamp-3">{item.content}</p>
            </a>
          ))}
        </div>
      )}
    </Layout>
  );
}
