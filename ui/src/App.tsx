import { useEffect, useState } from 'react';
import { View, Article, Feed } from './types';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { Dashboard } from './components/Dashboard';
import { SourceManagement } from './components/Sources';
import { AuthScreen } from './components/AuthScreen';
import { SettingsPanel } from './components/Settings';
import { LayoutDashboard, Rss, Settings } from 'lucide-react';
import {
  addFeed,
  changePassword,
  deleteAccount,
  deleteFeed,
  fetchBootstrap,
  markAllRead,
  syncAllFeeds,
  syncFeed,
  updateArticle,
} from './api';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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

  const showEmptyState = () => {
    setFeeds([]);
    setCategories(['All News']);
    setArticles([]);
    setStats({ unreadCount: 0, savedCount: 0 });
    setSelectedArticle(null);
    setError(null);
  };

  const handleLoadError = (loadError: unknown, fallbackMessage: string) => {
    if (isEmptyReadableError(loadError)) {
      showEmptyState();
      return;
    }

    setError(toUserFacingError(loadError, fallbackMessage));
  };

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
      }

      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);

      if (!nextSession) {
        setView(View.DASHBOARD);
        setSelectedArticle(null);
        setArticles([]);
        setFeeds([]);
        setCategories(['All News']);
        setActiveCategory('All News');
        setSearch('');
        setStats({ unreadCount: 0, savedCount: 0 });
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
    if (!session || authLoading) {
      return;
    }

    setLoading(true);

    if (view === View.ARCHIVE) {
      void loadState({ saved: true })
        .then(() => setError(null))
        .catch((loadError) => handleLoadError(loadError, 'Failed to load saved articles.'))
        .finally(() => setLoading(false));
      return;
    }

    void loadState()
      .then(() => setError(null))
      .catch((loadError) => handleLoadError(loadError, 'Failed to refresh articles.'))
      .finally(() => setLoading(false));
  }, [activeCategory, authLoading, search, session?.user.id, view]);

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
    if (!session || !selectedArticle || !selectedArticle.unread) {
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
  }, [selectedArticle?.id, session?.user.id]);

  const archiveArticles = articles.filter((article) => article.saved);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      await syncAllFeeds();
      await loadState({ saved: view === View.ARCHIVE });
    } catch (syncError) {
      setError(toUserFacingError(syncError, 'Sync failed.'));
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      await loadState({ saved: view === View.ARCHIVE });
    } catch (markError) {
      setError(toUserFacingError(markError, 'Failed to mark all read.'));
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
      if (isEmptyReadableError(toggleError)) {
        showEmptyState();
        return;
      }

      setError(toUserFacingError(toggleError, 'Failed to save article.'));
    }
  };

  const handleAddFeed = async (url: string) => {
    try {
      setSyncing(true);
      setError(null);
      const feed = await addFeed(url);
      setSyncingFeedId(feed.id);
      await syncFeed(feed.id);
      await loadState();
    } catch (syncError) {
      setError(toUserFacingError(syncError, 'Feed sync failed.'));
    } finally {
      setSyncing(false);
      setSyncingFeedId(null);
    }
  };

  const handleFeedSync = async (feedId: string) => {
    try {
      setSyncing(true);
      setSyncingFeedId(feedId);
      setError(null);
      await syncFeed(feedId);
      await loadState();
    } catch (syncError) {
      setError(toUserFacingError(syncError, 'Feed sync failed.'));
    } finally {
      setSyncing(false);
      setSyncingFeedId(null);
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    try {
      setError(null);
      await deleteFeed(feedId);
      await loadState({ saved: view === View.ARCHIVE });
    } catch (deleteError) {
      setError(toUserFacingError(deleteError, 'Failed to delete source.'));
    }
  };

  const handleSignOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
    }
  };

  const handleChangePassword = async (password: string) => {
    await changePassword(password);
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    await supabase.auth.signOut();
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
            loading={loading}
          />
        );
      case View.SOURCES:
        return (
          <SourceManagement
            feeds={feeds}
            onAddFeed={(url) => void handleAddFeed(url)}
            onSyncFeed={(feedId) => void handleFeedSync(feedId)}
            onDeleteFeed={(feedId) => void handleDeleteFeed(feedId)}
            syncing={syncing}
            syncingFeedId={syncingFeedId}
          />
        );
      case View.SETTINGS:
        return (
          <SettingsPanel
            userEmail={session?.user.email}
            onChangePassword={handleChangePassword}
            onDeleteAccount={handleDeleteAccount}
            onSignOut={() => void handleSignOut()}
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
            loading={loading}
          />
        );
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="border border-black bg-white brutalist-shadow-small px-6 py-4 text-label-sm">
          Checking session
        </div>
      </main>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar activeView={view} onViewChange={setView} />
      
      <div className="md:ml-64 flex flex-col min-h-screen">
        <DashboardHeader
          search={search}
          syncing={syncing}
          unreadCount={stats.unreadCount}
          userEmail={session.user.email}
          onSearchChange={setSearch}
          onSync={() => void handleSync()}
          onMarkAllRead={() => void handleMarkAllRead()}
          onSignOut={() => void handleSignOut()}
        />
        
        <main className="mt-16 px-4 md:px-margin-desktop min-h-[calc(100vh-64px)] overflow-y-auto">
          {error && !isEmptyReadableMessage(error) ? (
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
          onClick={() => setView(View.SOURCES)}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === View.SOURCES ? 'text-primary' : 'text-black/40'}`}
        >
          <Rss size={18} strokeWidth={view === View.SOURCES ? 3 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Source</span>
        </button>
        <button 
          onClick={() => setView(View.SETTINGS)}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === View.SETTINGS ? 'text-primary' : 'text-black/40'}`}
        >
          <Settings size={18} strokeWidth={view === View.SETTINGS ? 3 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Set</span>
        </button>
      </nav>
    </div>
  );
}

function toUserFacingError(error: unknown, fallbackMessage: string) {
  if (isEmptyReadableError(error)) {
    return 'Empty. Add a source, then sync to load articles.';
  }

  return error instanceof Error ? error.message : fallbackMessage;
}

function isEmptyReadableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return isEmptyReadableMessage(error.message);
}

function isEmptyReadableMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('permission denied') ||
    normalized.includes('row-level security') ||
    normalized.includes('rls') ||
    normalized.includes('0 rows') ||
    normalized.includes('no rows')
  );
}
