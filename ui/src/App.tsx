import { useEffect, useState } from 'react';
import { View, Article, Feed } from './types';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { Dashboard } from './components/Dashboard';
import { Reader } from './components/Reader';
import { SourceManagement } from './components/Sources';
import { LayoutDashboard, BookOpen, Rss, Settings } from 'lucide-react';
import { addFeed, fetchBootstrap, markAllRead, syncAllFeeds, syncFeed, updateArticle } from './api';

export default function App() {
  const [view, setView] = useState<View>(View.DASHBOARD);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [categories, setCategories] = useState<string[]>(['All News']);
  const [activeCategory, setActiveCategory] = useState('All News');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ unreadCount: 0, savedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
    setView(View.READER);
  };

  const loadState = async (overrides?: {
    category?: string;
    search?: string;
    saved?: boolean;
    articleId?: string;
  }) => {
    const category = overrides?.category ?? activeCategory;
    const currentSearch = overrides?.search ?? search;
    const saved = overrides?.saved ?? false;
    const articleId = overrides?.articleId ?? selectedArticle?.id;

    const payload = await fetchBootstrap({
      category: saved ? undefined : category,
      search: currentSearch,
      saved,
      articleId,
    });

    setFeeds(payload.feeds);
    setCategories(payload.categories);
    setArticles(payload.articles);
    setStats(payload.stats);

    if (payload.selectedArticle) {
      setSelectedArticle(payload.selectedArticle);
    } else if (articleId) {
      setSelectedArticle(payload.articles.find((article) => article.id === articleId) ?? null);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadState();
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load feed state.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    if (view === View.ARCHIVE) {
      void loadState({ saved: true }).catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load saved articles.');
      });
      return;
    }

    void loadState().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Failed to refresh articles.');
    });
  }, [activeCategory, search, view]);

  useEffect(() => {
    if (!selectedArticle) {
      return;
    }

    const current = articles.find((article) => article.id === selectedArticle.id);
    if (current) {
      setSelectedArticle(current);
    }
  }, [articles, selectedArticle]);

  useEffect(() => {
    if (!selectedArticle || !selectedArticle.unread) {
      return;
    }

    void updateArticle(selectedArticle.id, { unread: false })
      .then((updated) => {
        setArticles((current) => current.map((article) => (article.id === updated.id ? updated : article)));
        setSelectedArticle(updated);
        setStats((current) => ({
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
        }));
      })
      .catch(() => {});
  }, [selectedArticle?.id]);

  const archiveArticles = articles.filter((article) => article.saved);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      await syncAllFeeds();
      await loadState({ saved: view === View.ARCHIVE });
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      await loadState({ saved: view === View.ARCHIVE });
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Failed to mark all read.');
    }
  };

  const handleToggleSaved = async (article: Article) => {
    try {
      const updated = await updateArticle(article.id, { saved: !article.saved });
      setArticles((current) => {
        const next = current.map((entry) => (entry.id === updated.id ? updated : entry));
        return view === View.ARCHIVE ? next.filter((entry) => entry.saved) : next;
      });
      setSelectedArticle(updated);
      setStats((current) => ({
        ...current,
        savedCount: Math.max(0, current.savedCount + (updated.saved ? 1 : -1)),
      }));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to save article.');
    }
  };

  const handleAddFeed = async (url: string) => {
    await addFeed(url);
    await loadState();
  };

  const handleFeedSync = async (feedId: string) => {
    try {
      setSyncing(true);
      setSyncingFeedId(feedId);
      setError(null);
      await syncFeed(feedId);
      await loadState();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Feed sync failed.');
    } finally {
      setSyncing(false);
      setSyncingFeedId(null);
    }
  };

  const renderContent = () => {
    switch (view) {
      case View.DASHBOARD:
        return (
          <Dashboard
            articles={articles}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onArticleClick={handleArticleClick}
            loading={loading}
          />
        );
      case View.READER:
        return selectedArticle ? (
          <Reader
            article={selectedArticle}
            onBack={() => setView(View.DASHBOARD)}
            onToggleSaved={() => void handleToggleSaved(selectedArticle)}
          />
        ) : (
          <Dashboard
            articles={articles}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onArticleClick={handleArticleClick}
            loading={loading}
          />
        );
      case View.SOURCES:
        return (
          <SourceManagement
            feeds={feeds}
            onAddFeed={(url) => void handleAddFeed(url)}
            onSyncFeed={(feedId) => void handleFeedSync(feedId)}
            syncing={syncing}
            syncingFeedId={syncingFeedId}
          />
        );
      case View.HELP:
        return (
          <div className="reading-column py-12">
            <h1 className="text-display-lg font-bold mb-4">Help & Support</h1>
            <p className="text-body-lg">Add RSS or Atom feed URLs in Sources, then use Sync to refresh the home stream every 30 minutes or on demand.</p>
          </div>
        );
      case View.ARCHIVE:
        return (
          <div className="reading-column py-12">
            <h1 className="text-display-lg font-bold mb-4">Archive</h1>
            <Dashboard
              articles={archiveArticles}
              categories={['Saved']}
              activeCategory="Saved"
              onCategoryChange={() => {}}
              onArticleClick={handleArticleClick}
              loading={loading}
            />
          </div>
        );
      default:
        return (
          <Dashboard
            articles={articles}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onArticleClick={handleArticleClick}
            loading={loading}
          />
        );
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar activeView={view} onViewChange={setView} />
      
      <div className="md:ml-64 flex flex-col min-h-screen">
        <DashboardHeader
          search={search}
          syncing={syncing}
          unreadCount={stats.unreadCount}
          onSearchChange={setSearch}
          onSync={() => void handleSync()}
          onMarkAllRead={() => void handleMarkAllRead()}
        />
        
        <main className="mt-16 px-4 md:px-margin-desktop min-h-[calc(100vh-64px)] overflow-y-auto">
          {error ? (
            <div className="reading-column pt-6">
              <div className="border border-black bg-white px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary">
                {error}
              </div>
            </div>
          ) : null}
          {renderContent()}
        </main>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black flex justify-around items-center h-16 z-50">
        <button 
          onClick={() => setView(View.DASHBOARD)}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === View.DASHBOARD ? 'text-primary' : 'text-black/40'}`}
        >
          <LayoutDashboard size={18} strokeWidth={view === View.DASHBOARD ? 3 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Dash</span>
        </button>
        <button 
          onClick={() => setView(View.READER)}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === View.READER ? 'text-primary' : 'text-black/40'}`}
        >
          <BookOpen size={18} strokeWidth={view === View.READER ? 3 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Read</span>
        </button>
        <button 
          onClick={() => setView(View.SOURCES)}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === View.SOURCES ? 'text-primary' : 'text-black/40'}`}
        >
          <Rss size={18} strokeWidth={view === View.SOURCES ? 3 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Source</span>
        </button>
        <button 
          className="flex flex-col items-center justify-center gap-1 text-black/40 transition-colors"
        >
          <Settings size={18} />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Set</span>
        </button>
      </nav>
    </div>
  );
}
