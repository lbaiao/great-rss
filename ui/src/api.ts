import type { BootstrapPayload, Feed, Article } from './types';
import { getFunctionsBaseUrl, supabase } from './supabase';

type FeedRow = {
  id: string;
  url: string;
  name: string;
  category: string;
  status: Feed['status'];
  last_synced_at: string | null;
  last_error: string | null;
};

type ArticleRow = {
  id: string;
  source: string;
  title: string;
  snippet: string;
  content: string;
  author: string;
  published_at: string;
  category: string;
  read_time_minutes: number;
  unread: boolean;
  saved: boolean;
  image_url: string | null;
  tags: string[] | null;
  url: string;
};

export function fetchBootstrap(params?: {
  category?: string;
  search?: string;
  saved?: boolean;
  articleId?: string;
}) {
  return loadBootstrap(params);
}

export async function addFeed(url: string, category = 'General') {
  const payload = {
    url,
    category,
    name: deriveFeedName(url),
    status: 'idle' as const,
  };

  const { data, error } = await supabase
    .from('feeds')
    .insert(payload)
    .select('id, url, name, category, status, last_synced_at, last_error')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapFeed(data);
}

export async function syncAllFeeds() {
  return invokeSync();
}

export async function syncFeed(feedId: string) {
  return invokeSync(feedId);
}

export async function updateArticle(articleId: string, patch: Partial<Pick<Article, 'unread' | 'saved'>>) {
  const { data, error } = await supabase
    .from('articles')
    .update(toArticlePatch(patch))
    .eq('id', articleId)
    .select(
      'id, source, title, snippet, content, author, published_at, category, read_time_minutes, unread, saved, image_url, tags, url',
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapArticle(data);
}

export async function markAllRead() {
  const { error } = await supabase
    .from('articles')
    .update({ unread: false })
    .eq('unread', true);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true as const };
}

async function loadBootstrap(params?: {
  category?: string;
  search?: string;
  saved?: boolean;
  articleId?: string;
}): Promise<BootstrapPayload> {
  const [feedsResult, articlesResult] = await Promise.all([
    supabase
      .from('feeds')
      .select('id, url, name, category, status, last_synced_at, last_error')
      .order('created_at', { ascending: true }),
    supabase
      .from('articles')
      .select(
        'id, source, title, snippet, content, author, published_at, category, read_time_minutes, unread, saved, image_url, tags, url',
      )
      .order('published_at', { ascending: false }),
  ]);

  if (feedsResult.error) {
    throw new Error(feedsResult.error.message);
  }

  if (articlesResult.error) {
    throw new Error(articlesResult.error.message);
  }

  let articles = (articlesResult.data ?? []).map(mapArticle);

  if (params?.saved) {
    articles = articles.filter((article) => article.saved);
  }

  if (params?.category && params.category !== 'All News') {
    articles = articles.filter((article) => article.category === params.category);
  }

  const search = params?.search?.trim().toLowerCase();
  if (search) {
    articles = articles.filter((article) =>
      `${article.title} ${article.snippet} ${article.source} ${article.category} ${article.tags.join(' ')}`
        .toLowerCase()
        .includes(search),
    );
  }

  const allArticles = (articlesResult.data ?? []).map(mapArticle);
  const selectedArticle = params?.articleId
    ? allArticles.find((article) => article.id === params.articleId) ?? null
    : null;

  return {
    feeds: (feedsResult.data ?? []).map(mapFeed),
    articles,
    categories: buildCategories(allArticles),
    stats: {
      unreadCount: allArticles.filter((article) => article.unread).length,
      savedCount: allArticles.filter((article) => article.saved).length,
    },
    selectedArticle,
  };
}

async function invokeSync(feedId?: string) {
  const response = await fetch(`${getFunctionsBaseUrl()}/sync-feeds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(feedId ? { feedId } : {}),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Sync failed with status ${response.status}.`);
  }

  return (await response.json()) as { ok: true; feeds: number; inserted: number };
}

function mapFeed(row: FeedRow): Feed {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    category: row.category,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
  };
}

function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    snippet: row.snippet,
    content: row.content,
    author: row.author,
    date: formatDisplayDate(row.published_at),
    publishedAt: row.published_at,
    category: row.category,
    readTime: `${row.read_time_minutes} min read`,
    timeAgo: formatTimeAgo(row.published_at),
    unread: row.unread,
    saved: row.saved,
    imageUrl: row.image_url ?? undefined,
    tags: row.tags ?? [],
    url: row.url,
  };
}

function toArticlePatch(patch: Partial<Pick<Article, 'unread' | 'saved'>>) {
  return {
    ...(typeof patch.unread === 'boolean' ? { unread: patch.unread } : {}),
    ...(typeof patch.saved === 'boolean' ? { saved: patch.saved } : {}),
  };
}

function buildCategories(articles: Article[]) {
  return ['All News', ...Array.from(new Set(articles.map((article) => article.category).filter(Boolean)))];
}

function deriveFeedName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const base = hostname.split('.')[0] || 'New Feed';
    return base
      .split(/[-_]/g)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'New Feed';
  }
}

function formatDisplayDate(isoString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoString));
}

function formatTimeAgo(isoString: string) {
  const diffMs = Date.now() - Date.parse(isoString);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  }
  if (diffMs < day) {
    return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  }
  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
}
