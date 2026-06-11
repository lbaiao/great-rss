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

type ArticleStateRow = {
  article_id: string;
  unread: boolean;
  saved: boolean;
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
  const userId = await requireCurrentUserId();
  const payload = {
    user_id: userId,
    url,
    category,
    name: deriveFeedName(url),
  };

  const { data, error } = await supabase
    .from('feeds')
    .insert(payload)
    .select('id, url, name, category, status, last_synced_at, last_error')
    .single();

  if (error) {
    throwApiError(error.message);
  }

  return mapFeed(data);
}

export async function syncAllFeeds() {
  return invokeSync();
}

export async function syncFeed(feedId: string) {
  return invokeSync(feedId);
}

export async function deleteFeed(feedId: string) {
  const { error } = await supabase
    .from('feeds')
    .delete()
    .eq('id', feedId);

  if (error) {
    throwApiError(error.message);
  }

  return { ok: true as const };
}

export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throwApiError(error.message);
  }

  return { ok: true as const };
}

export async function deleteAccount() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('Sign in required.');
  }

  const response = await fetch(`${getFunctionsBaseUrl()}/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ confirm: true }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throwApiError(payload?.error || `Delete account failed with status ${response.status}.`);
  }

  return { ok: true as const };
}

export async function updateArticle(articleId: string, patch: Partial<Pick<Article, 'unread' | 'saved'>>) {
  const userId = await requireCurrentUserId();
  const currentState = await loadArticleState(userId, articleId);
  const nextState = {
    user_id: userId,
    article_id: articleId,
    unread: typeof patch.unread === 'boolean' ? patch.unread : currentState?.unread ?? true,
    saved: typeof patch.saved === 'boolean' ? patch.saved : currentState?.saved ?? false,
  };

  const { data: state, error } = await supabase
    .from('user_article_states')
    .upsert(nextState, { onConflict: 'user_id,article_id' })
    .select('article_id, unread, saved')
    .single();

  if (error) {
    throwApiError(error.message);
  }

  return loadArticle(articleId, state);
}

export async function markAllRead() {
  const userId = await requireCurrentUserId();
  const [{ data: articles, error: articlesError }, { data: states, error: statesError }] = await Promise.all([
    supabase.from('articles').select('id'),
    supabase.from('user_article_states').select('article_id, unread, saved').eq('user_id', userId),
  ]);

  if (articlesError) {
    throwApiError(articlesError.message);
  }

  if (statesError) {
    throwApiError(statesError.message);
  }

  const stateByArticleId = new Map((states ?? []).map((state) => [state.article_id, state]));
  const rows = (articles ?? []).map((article) => {
    const current = stateByArticleId.get(article.id);
    return {
      user_id: userId,
      article_id: article.id,
      unread: false,
      saved: current?.saved ?? false,
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from('user_article_states')
      .upsert(rows, { onConflict: 'user_id,article_id' });

    if (error) {
      throwApiError(error.message);
    }
  }

  return { ok: true as const };
}

async function loadBootstrap(params?: {
  category?: string;
  search?: string;
  saved?: boolean;
  articleId?: string;
}): Promise<BootstrapPayload> {
  const userId = await requireCurrentUserId();
  const [feedsResult, articlesResult, statesResult] = await Promise.all([
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
    supabase
      .from('user_article_states')
      .select('article_id, unread, saved')
      .eq('user_id', userId),
  ]);

  if (feedsResult.error) {
    throwApiError(feedsResult.error.message);
  }

  if (articlesResult.error) {
    throwApiError(articlesResult.error.message);
  }

  if (statesResult.error) {
    throwApiError(statesResult.error.message);
  }

  const stateByArticleId = new Map((statesResult.data ?? []).map((state) => [state.article_id, state]));
  let articles = (articlesResult.data ?? []).map((row) => mapArticle(row, stateByArticleId.get(row.id)));

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

  const allArticles = (articlesResult.data ?? []).map((row) => mapArticle(row, stateByArticleId.get(row.id)));
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
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('Sign in required to sync feeds.');
  }

  const response = await fetch(`${getFunctionsBaseUrl()}/sync-feeds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(feedId ? { feedId } : {}),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throwApiError(payload?.error || `Sync failed with status ${response.status}.`);
  }

  return (await response.json()) as { ok: true; feeds: number; inserted: number };
}

async function requireCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throwApiError(error.message);
  }

  if (!data.user) {
    throw new Error('Sign in required.');
  }

  return data.user.id;
}

async function loadArticleState(userId: string, articleId: string) {
  const { data, error } = await supabase
    .from('user_article_states')
    .select('article_id, unread, saved')
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .maybeSingle();

  if (error) {
    throwApiError(error.message);
  }

  return data;
}

async function loadArticle(articleId: string, state?: ArticleStateRow | null) {
  const { data, error } = await supabase
    .from('articles')
    .select(
      'id, source, title, snippet, content, author, published_at, category, read_time_minutes, unread, saved, image_url, tags, url',
    )
    .eq('id', articleId)
    .single();

  if (error) {
    throwApiError(error.message);
  }

  return mapArticle(data, state);
}

function mapFeed(row: FeedRow): Feed {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    category: row.category,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastError: sanitizeRemoteMessage(row.last_error),
  };
}

function mapArticle(row: ArticleRow, state?: ArticleStateRow | null): Article {
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
    unread: state?.unread ?? true,
    saved: state?.saved ?? false,
    imageUrl: row.image_url ?? undefined,
    tags: row.tags ?? [],
    url: row.url,
  };
}

function buildCategories(articles: Article[]) {
  return ['All News', ...Array.from(new Set(articles.map((article) => article.category).filter(Boolean)))];
}

function throwApiError(message: string): never {
  throw new Error(sanitizeRemoteMessage(message) ?? 'Request failed.');
}

function sanitizeRemoteMessage(message: string | null) {
  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('permission denied') ||
    normalized.includes('row-level security') ||
    normalized.includes('rls')
  ) {
    return 'Empty. Add a source, then sync to load articles.';
  }

  return message;
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
