import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, ThumbsDown, ThumbsUp, ArrowLeft, CalendarDays } from 'lucide-react';
import { documentationApi, type DocumentationArticle, type DocumentationCategory } from '../services/api';
import { Card, Button } from './ui';

export function DocumentationCenterPage() {
  const [categories, setCategories] = useState<DocumentationCategory[]>([]);
  const [articles, setArticles] = useState<DocumentationArticle[]>([]);
  const [selected, setSelected] = useState<DocumentationArticle | null>(null);
  const [related, setRelated] = useState<DocumentationArticle[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await documentationApi.list({ ...(category ? { category } : {}), ...(search.trim() ? { search: search.trim() } : {}) });
      setArticles(result.data || []);
    } catch {
      setError('Dokumentasi belum dapat dimuat. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    documentationApi.categories().then((r) => setCategories(r.data || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => { void loadArticles(); }, [category, search]);

  const headings = useMemo(() => (selected?.body_markdown || '').split('\n')
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, '').trim()), [selected]);

  const openArticle = async (slug: string) => {
    setFeedback('');
    try {
      const result = await documentationApi.get(slug);
      setSelected(result.article);
      setRelated(result.related || []);
    } catch {
      setError('Artikel tidak dapat dibuka atau akses Anda tidak mencukupi.');
    }
  };

  const sendFeedback = async (was_helpful: boolean) => {
    if (!selected) return;
    try {
      await documentationApi.feedback(selected.id, { was_helpful });
      setFeedback('Terima kasih atas feedback Anda.');
    } catch {
      setFeedback('Feedback belum dapat disimpan.');
    }
  };

  if (selected) return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <Button variant="ghost" onClick={() => setSelected(null)} className="flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Kembali ke dokumentasi</Button>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span>{selected.category?.name || 'Panduan ERP'}</span><span>•</span>
          <span>Versi {selected.current_version}</span><span>•</span>
          {selected.published_at && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Diperbarui {new Date(selected.published_at).toLocaleDateString('id-ID')}</span>}
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">{selected.title}</h1>
        {selected.summary && <p className="text-[var(--muted-foreground)]">{selected.summary}</p>}
        {headings.length > 0 && <aside className="rounded-xl border border-[var(--border)] p-4"><h2 className="mb-2 font-semibold">Daftar Isi</h2><ol className="list-decimal space-y-1 pl-5 text-sm">{headings.map((heading, i) => <li key={i}>{heading}</li>)}</ol></aside>}
        <article className="whitespace-pre-wrap break-words text-sm leading-7 text-[var(--foreground)]">{selected.body_markdown}</article>
        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-sm font-medium">Apakah artikel ini membantu?</p>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => void sendFeedback(true)}><ThumbsUp className="mr-2 h-4 w-4" /> Ya</Button><Button variant="secondary" onClick={() => void sendFeedback(false)}><ThumbsDown className="mr-2 h-4 w-4" /> Tidak</Button></div>
          {feedback && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{feedback}</p>}
        </div>
      </Card>
      {related.length > 0 && <Card><h2 className="mb-3 font-semibold">Artikel terkait</h2><div className="space-y-2">{related.map((item) => <button key={item.id} onClick={() => void openArticle(item.slug)} className="block text-left text-sm text-indigo-600 hover:underline">{item.title}</button>)}</div></Card>}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header><div className="flex items-center gap-3"><BookOpen className="h-7 w-7 text-indigo-500" /><h1 className="text-2xl font-bold text-[var(--foreground)]">Documentation Center</h1></div><p className="mt-1 text-sm text-[var(--muted-foreground)]">Panduan resmi penggunaan Sentanu Jaya ERP.</p></header>
      <Card className="flex items-center gap-3"><Search className="h-5 w-5 text-[var(--muted-foreground)]" /><input aria-label="Cari dokumentasi" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, isi, atau kata kunci..." className="w-full bg-transparent text-sm outline-none" /></Card>
      <div className="flex flex-wrap gap-2"><Button variant={category === '' ? 'primary' : 'secondary'} onClick={() => setCategory('')}>Semua</Button>{categories.map((item) => <Button key={item.id} variant={category === item.slug ? 'primary' : 'secondary'} onClick={() => setCategory(item.slug)}>{item.name}</Button>)}</div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {loading ? <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">Memuat dokumentasi…</p> : articles.length === 0 ? <Card className="py-12 text-center text-sm text-[var(--muted-foreground)]">Belum ada artikel yang dipublikasikan untuk pencarian ini.</Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{articles.map((article) => <button key={article.id} onClick={() => void openArticle(article.slug)} className="text-left"><Card className="h-full space-y-2 transition hover:-translate-y-0.5 hover:shadow-lg"><p className="text-xs text-indigo-500">{article.category?.name || 'Panduan ERP'} · v{article.current_version}</p><h2 className="font-semibold text-[var(--foreground)]">{article.title}</h2><p className="line-clamp-3 text-sm text-[var(--muted-foreground)]">{article.summary}</p></Card></button>)}</div>}
    </div>
  );
}
