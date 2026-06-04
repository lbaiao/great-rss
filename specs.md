Use **web-first + mobile wrapper**.

Best starter stack:

**Frontend**

* **Next.js + React + TypeScript**
* Responsive UI so it works well on desktop/mobile browser
* Later wrap with **Capacitor** for iOS/Android app-store builds. Capacitor is designed to turn web apps into native iOS/Android apps from one codebase. ([Capacitor][1])

**Backend**

* **Supabase** for auth, database, storage, and scheduled jobs
* Use **Supabase Cron / scheduled Edge Functions** to fetch RSS feeds periodically. ([Supabase][2])

**Core MVP features**

1. Add RSS feed URL.
2. Background job fetches feeds every 30–60 minutes.
3. Store normalized articles in DB.
4. Home feed: title, source, date, short excerpt.
5. Mark read / unread.
6. Save/bookmark articles.
7. Simple categories or tags.
8. Mobile-friendly reading view.

**Simplest architecture**

```text
Next.js app
  ├─ Web UI
  ├─ API routes / server actions
  └─ Capacitor wrapper later

Supabase
  ├─ users
  ├─ feeds
  ├─ articles
  ├─ saved_articles
  └─ cron job → fetch RSS → insert new articles
```

**Avoid at first**

* AI summaries
* recommendation algorithms
* full-text scraping
* native React Native app
* complex offline mode
* comments/social features

My recommendation: build it first as a **PWA-style responsive web app**, then wrap it with **Capacitor** only once the product feels useful. Expo/React Native is good, but for your goal, it adds more complexity than needed at the start.

[1]: https://capacitorjs.com/docs/?utm_source=chatgpt.com "Capacitor - Cross-platform Native Runtime for Web Apps"
[2]: https://supabase.com/docs/guides/cron?utm_source=chatgpt.com "Cron | Supabase Docs"

