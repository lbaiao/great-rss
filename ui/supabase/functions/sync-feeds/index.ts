import { createClient } from "jsr:@supabase/supabase-js@2";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

type FeedRow = {
  id: string;
  user_id: string;
  url: string;
  name: string;
  category: string;
};

type ParsedFeed = {
  title: string;
  items: Array<{
    title: string;
    link: string;
    content: string;
    snippet: string;
    author: string;
    publishedAt: string;
    tags: string[];
    imageUrl?: string;
  }>;
};

const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKey = resolveDefaultSecretKey(secretKeysJson);
const ARTICLE_RETENTION_DAYS = 30;

if (!supabaseUrl || !secretKey) {
  throw new Error("SUPABASE_URL and the default Supabase secret key are required.");
}

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const userId = await getRequestUserId(request);
  if (!userId) {
    return json({ error: "Sign in required." }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const feedId = typeof body.feedId === "string" ? body.feedId : null;

  const feedQuery = supabaseAdmin
    .from("feeds")
    .select("id, user_id, url, name, category")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const { data: feeds, error } = feedId
    ? await feedQuery.eq("id", feedId)
    : await feedQuery;

  if (error) {
    return json({ error: error.message }, 500);
  }

  let inserted = 0;
  const results: Array<{
    feedId: string;
    inserted: number;
    itemCount?: number;
    skippedExpired?: number;
    newRowCount?: number;
    error?: string;
  }> = [];

  for (const feed of feeds satisfies FeedRow[]) {
    try {
      const result = await syncFeed(supabaseAdmin, feed);
      inserted += result.inserted;
      results.push(result);
    } catch (syncError) {
      const message = toErrorMessage(syncError);
      await supabaseAdmin
        .from("feeds")
        .update({ status: "error", last_error: message })
        .eq("user_id", feed.user_id)
        .eq("id", feed.id);
      results.push({ feedId: feed.id, inserted: 0, error: message });
    }
  }

  return json({ ok: true, feeds: feeds.length, inserted, results });
});

async function syncFeed(supabase: SupabaseClient, feed: FeedRow) {
  await supabase
    .from("feeds")
    .update({ status: "syncing", last_error: null })
    .eq("id", feed.id);

  const response = await fetch(feed.url, {
    headers: {
      "user-agent": "great-rss/1.0",
      "accept": "application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, application/json;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed with status ${response.status}.`);
  }

  const raw = await response.text();
  const parsed = parseFeedDocument(raw, response.headers.get("content-type") ?? "", feed.url);
  const retentionCutoffMs = Date.now() - ARTICLE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const retainedItems = parsed.items.filter((item) => Date.parse(item.publishedAt) >= retentionCutoffMs);
  const skippedExpired = parsed.items.length - retainedItems.length;
  const rows = await Promise.all(retainedItems.map(async (item) => {
    const fingerprint = await sha1(`${feed.id}|${item.link}|${item.title}|${item.publishedAt}`);
    return {
      user_id: feed.user_id,
      feed_id: feed.id,
      source: parsed.title || feed.name,
      title: item.title || "Untitled article",
      snippet: item.snippet,
      content: item.content || wrapParagraphs(item.snippet || "No content available."),
      author: item.author || parsed.title || feed.name,
      published_at: item.publishedAt || new Date().toISOString(),
      category: item.tags[0] || feed.category || "General",
      read_time_minutes: estimateReadTimeMinutes(item.content || item.snippet),
      unread: true,
      saved: false,
      image_url: item.imageUrl,
      tags: item.tags.slice(0, 5),
      url: item.link,
      fingerprint,
    };
  }));

  let inserted = 0;
  let newRowCount = 0;
  if (rows.length > 0) {
    const fingerprints = rows.map((row) => row.fingerprint);
    const { data: existingRows, error: existingError } = await supabase
      .from("articles")
      .select("fingerprint")
      .eq("user_id", feed.user_id)
      .in("fingerprint", fingerprints);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existingFingerprints = new Set((existingRows ?? []).map((row) => row.fingerprint));
    const newRows = rows.filter((row) => !existingFingerprints.has(row.fingerprint));
    newRowCount = newRows.length;

    if (newRows.length > 0) {
      const { data, error } = await supabase
        .from("articles")
        .insert(newRows)
        .select("id");

      if (error) {
        throw new Error(`Article insert failed: ${error.message}`);
      }

      inserted = data?.length ?? 0;
    }
  }

  await supabase
    .from("feeds")
    .update({
      name: parsed.title || feed.name,
      status: "live",
      last_error: null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("user_id", feed.user_id)
    .eq("id", feed.id);

  return { feedId: feed.id, inserted, itemCount: parsed.items.length, skippedExpired, newRowCount };
}

async function getRequestUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

function parseFeedDocument(raw: string, contentType: string, sourceUrl: string): ParsedFeed {
  const trimmed = raw.trim();
  if (contentType.includes("json") || trimmed.startsWith("{")) {
    return parseJsonFeed(trimmed, sourceUrl);
  }

  return parseXmlFeed(trimmed, sourceUrl);
}

function parseJsonFeed(raw: string, sourceUrl: string): ParsedFeed {
  const data = JSON.parse(raw) as {
    title?: string;
    items?: Array<{
      title?: string;
      url?: string;
      external_url?: string;
      content_html?: string;
      content_text?: string;
      summary?: string;
      date_published?: string;
      authors?: Array<{ name?: string }>;
      tags?: string[];
      image?: string;
    }>;
  };

  return {
    title: data.title || deriveFeedName(sourceUrl),
    items: (data.items ?? []).map((item) => ({
      title: item.title || "Untitled article",
      link: item.url || item.external_url || sourceUrl,
      content: item.content_html || wrapParagraphs(item.content_text || item.summary || ""),
      snippet: item.summary || "",
      author: item.authors?.map((author) => author.name).filter(Boolean).join(", ") || "",
      publishedAt: item.date_published || new Date().toISOString(),
      tags: item.tags ?? [],
      imageUrl: item.image,
    })),
  };
}

function parseXmlFeed(raw: string, sourceUrl: string): ParsedFeed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true,
    parseTagValue: false,
  });
  const parsed = parser.parse(raw) as Record<string, unknown>;
  if (parsed.feed) {
    return parseAtomObject(parsed.feed as Record<string, unknown>, sourceUrl);
  }
  if (parsed.rss) {
    return parseRssObject(parsed.rss as Record<string, unknown>, sourceUrl);
  }
  throw new Error("Unsupported XML feed format.");
}

function parseRssObject(rss: Record<string, unknown>, sourceUrl: string): ParsedFeed {
  const channel = asRecord(rss.channel);
  const channelTitle = readText(channel?.title) || deriveFeedName(sourceUrl);
  const items = asArray(channel?.item).map((itemValue) => {
    const item = asRecord(itemValue);
    const description = readText(item?.description);
    const content =
      readText(item?.["content:encoded"]) ||
      description ||
      wrapParagraphs(readText(item?.title) || "");
    return {
      title: readText(item?.title) || "Untitled article",
      link: readText(item?.link) || sourceUrl,
      content,
      snippet: stripHtml(description),
      author: readText(item?.["dc:creator"]) || readText(item?.author) || channelTitle,
      publishedAt: normalizeDate(readText(item?.pubDate) || readText(item?.["dc:date"])),
      tags: asArray(item?.category).map((entry) => readText(entry)).filter(Boolean),
      imageUrl:
        readAttribute(item?.["media:content"], "url") ||
        readAttribute(item?.enclosure, "url") ||
        firstImageUrl(content),
    };
  });

  return { title: channelTitle, items };
}

function parseAtomObject(feed: Record<string, unknown>, sourceUrl: string): ParsedFeed {
  const title = readText(feed.title) || deriveFeedName(sourceUrl);
  const items = asArray(feed.entry).map((entryValue) => {
    const entry = asRecord(entryValue);
    const summary = readText(entry?.summary) || "";
    const content = readText(entry?.content) || wrapParagraphs(summary);
    const link =
      asArray(entry?.link)
        .map((value) => readAttribute(value, "href"))
        .find(Boolean) || sourceUrl;

    return {
      title: readText(entry?.title) || "Untitled article",
      link,
      content,
      snippet: summary,
      author: readText(asRecord(entry?.author)?.name) || title,
      publishedAt: normalizeDate(readText(entry?.published) || readText(entry?.updated)),
      tags: asArray(entry?.category)
        .map((value) => readAttribute(value, "term") || readText(value))
        .filter(Boolean),
      imageUrl: firstImageUrl(content),
    };
  });

  return { title, items };
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function wrapParagraphs(text: string): string {
  const normalized = decodeHtml(text).trim();
  if (!normalized) {
    return "<p>No content available.</p>";
  }

  return normalized
    .split(/\n{2,}/)
    .map((part) => `<p>${part.trim()}</p>`)
    .join("");
}

function normalizeDate(value: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
}

function estimateReadTimeMinutes(content: string): number {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function deriveFeedName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname.split(".")[0]?.replace(/[-_]/g, " ") || "New Feed";
  } catch {
    return "New Feed";
  }
}

async function sha1(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function resolveDefaultSecretKey(secretKeysJson: string | undefined) {
  if (!secretKeysJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(secretKeysJson) as Record<string, string>;
    return parsed.default ?? null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value == null ? [] : [value];
}

function readText(value: unknown): string {
  if (typeof value === "string") {
    return decodeHtml(value.trim());
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const record = asRecord(value);
  if (!record) {
    return "";
  }
  if (typeof record["#text"] === "string") {
    return decodeHtml(record["#text"].trim());
  }
  if (typeof record.cdata === "string") {
    return decodeHtml(record.cdata.trim());
  }
  return "";
}

function readAttribute(value: unknown, attribute: string): string | undefined {
  const record = asRecord(value);
  const raw = record?.[attribute];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

function firstImageUrl(html: string): string | undefined {
  return html.match(/<img[^>]*src=["']([^"']+)["']/i)?.[1];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}
