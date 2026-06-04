export type Article = {
  id: string;
  source: string;
  title: string;
  snippet: string;
  content: string;
  author: string;
  date: string;
  publishedAt: string;
  category: string;
  readTime: string;
  timeAgo: string;
  unread: boolean;
  saved: boolean;
  imageUrl?: string;
  tags: string[];
  url: string;
};

export type Feed = {
  id: string;
  url: string;
  name: string;
  category: string;
  status: 'idle' | 'syncing' | 'live' | 'error';
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type BootstrapPayload = {
  feeds: Feed[];
  articles: Article[];
  categories: string[];
  stats: {
    unreadCount: number;
    savedCount: number;
  };
  selectedArticle: Article | null;
};

export enum View {
  DASHBOARD = 'DASHBOARD',
  READER = 'READER',
  SOURCES = 'SOURCES',
  HELP = 'HELP',
  ARCHIVE = 'ARCHIVE'
}
