"use client";

import { useEffect, useState } from "react";
import { Newspaper, TrendingUp, AlertCircle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  published_at: string;
  source: string;
  thumbnail: string;
  category: string;
  ticker: string;
}

interface NewsResponse {
  articles: Article[];
  total: number;
  tickers: string[];
  categories: string[];
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  async function fetchNews(category?: string) {
    try {
      setLoading(true);
      const url = new URL(`${API_URL}/api/v1/news`);
      if (category && category !== "Todos") {
        url.searchParams.append("category", category);
      }
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error("Falha ao carregar notícias");
      const data: NewsResponse = await res.json();
      setArticles(data.articles);
      setCategories(["Todos", ...data.categories].filter((c, i, a) => a.indexOf(c) === i));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`${API_URL}/api/v1/news/categories`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
      }
    } catch {}
  }

  useEffect(() => {
    fetchCategories();
    fetchNews();
  }, []);

  useEffect(() => {
    fetchNews(selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Newspaper size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Notícias do Mercado</h1>
              <p className="text-sm text-text-muted mt-1">Acompanhe as últimas notícias financeiras</p>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger mb-6">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <Newspaper size={48} className="mx-auto text-text-muted/30 mb-4" />
            <p className="text-text-secondary">Nenhuma notícia disponível nessa categoria</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 p-4 rounded-lg border border-border bg-surface/40 hover:bg-surface/60 hover:border-primary/30 transition-all"
              >
                {/* Thumbnail */}
                {article.thumbnail && (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={article.thumbnail}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary font-medium flex-shrink-0 whitespace-nowrap">
                      {article.category}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-text-muted mb-3 line-clamp-2">
                    {article.summary}
                  </p>

                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-secondary">{article.source}</span>
                      <span>•</span>
                      <span>{article.ticker}</span>
                    </div>
                    {article.published_at && (
                      <span>{new Date(article.published_at).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
