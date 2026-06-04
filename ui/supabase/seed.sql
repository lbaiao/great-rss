insert into public.feeds (url, name, category, status, last_synced_at)
values
  ('https://www.theverge.com/rss/index.xml', 'The Verge', 'Technology', 'idle', null),
  ('https://www.wired.com/feed/rss', 'Wired', 'Technology', 'idle', null),
  ('https://techcrunch.com/feed/', 'TechCrunch', 'Technology', 'idle', null),
  ('https://hnrss.org/frontpage', 'Hacker News', 'Science', 'idle', null)
on conflict (url) do update
set
  name = excluded.name,
  category = excluded.category;

with feed_rows as (
  select id, name
  from public.feeds
  where name in ('The Verge', 'Wired', 'TechCrunch', 'Hacker News')
)
insert into public.articles (
  feed_id,
  source,
  title,
  snippet,
  content,
  author,
  published_at,
  category,
  read_time_minutes,
  unread,
  saved,
  tags,
  url,
  fingerprint
)
select
  fr.id,
  fr.name,
  seed.title,
  seed.snippet,
  seed.content,
  seed.author,
  seed.published_at,
  seed.category,
  seed.read_time_minutes,
  seed.unread,
  seed.saved,
  seed.tags,
  seed.url,
  seed.fingerprint
from (
  values
    (
      'The Verge',
      'The New Architecture of Digital Typography',
      'Exploring how modern web technologies are finally enabling a level of typographic control previously reserved for high-end print magazines and editorial design.',
      '<p>In an era dominated by soft gradients and rounded corners, a new movement is emerging. Designers are looking back at the mid-century functionalism of Swiss design and the uncompromising honesty of Brutalist architecture.</p><p>The core tenet of the International Typographic Style was simple: content is primary. Every line, every border, and every point of whitespace must serve the legibility of the information.</p><blockquote>Design is not for philosophy, it is for life. But life requires structure to be understood.</blockquote><h3>The 8px Baseline Grid</h3><p>A grid is more than a set of lines; it is a rhythmic structure for the eye.</p><div class="key-takeaways"><h4>Key Takeaways</h4><ul><li>Prioritize information density without decorative noise.</li><li>Use whitespace as a structural component, not a gap.</li><li>High-contrast typography is the most effective UI tool.</li></ul></div>',
      'Elias Thorne',
      timezone('utc', now()) - interval '12 minutes',
      'Architecture',
      3,
      true,
      false,
      array['Typography', 'Swiss Style', 'RSS']::text[],
      'https://example.com/articles/the-new-architecture-of-digital-typography',
      'seed-the-verge-typography'
    ),
    (
      'Wired',
      'Quantum Computing: A Blueprint for the Future',
      'New breakthroughs in cryogenic cooling systems are bringing us closer to scalable quantum processors that could redefine computational limits.',
      '<p>Deep technical content about quantum computing...</p>',
      'Sarah Jenkins',
      timezone('utc', now()) - interval '1 hour',
      'Technology',
      2,
      false,
      true,
      array['Quantum', 'Tech', 'Hardware']::text[],
      'https://example.com/articles/quantum-computing-blueprint',
      'seed-wired-quantum'
    ),
    (
      'TechCrunch',
      'The Rise of Minimalist Interface Design',
      'Why users are increasingly moving away from feature-heavy social platforms toward streamlined, purpose-built information tools.',
      '<p>Analysis of minimalist design trends...</p>',
      'Marco Rossi',
      timezone('utc', now()) - interval '3 hours',
      'Design',
      2,
      true,
      false,
      array['Minimalism', 'UI/UX']::text[],
      'https://example.com/articles/minimalist-interface-design',
      'seed-techcrunch-minimalism'
    ),
    (
      'Hacker News',
      'Rust for the Modern Web: A Case Study',
      'How a small team migrated their entire RSS processing pipeline to Rust, achieving 10x performance improvements and significantly lower memory usage.',
      '<p>A deep dive into using Rust for backend systems...</p>',
      'Alex Chen',
      timezone('utc', now()) - interval '5 hours',
      'Science',
      4,
      true,
      false,
      array['Rust', 'Back-end', 'Performance']::text[],
      'https://example.com/articles/rust-modern-web-case-study',
      'seed-hackernews-rust'
    )
) as seed(source_name, title, snippet, content, author, published_at, category, read_time_minutes, unread, saved, tags, url, fingerprint)
join feed_rows fr
  on fr.name = seed.source_name
on conflict (fingerprint) do nothing;
