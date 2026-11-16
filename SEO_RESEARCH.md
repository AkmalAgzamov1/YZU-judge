# SEO research and local implementation

Working notes for growing organic traffic to YZU Judge. This task is **local only** on
purpose: nothing here was committed or pushed to a PR. The code changes and the generator
are in the working tree so you can review them first.

## 1. Diagnosis: why the site was invisible to search

The whole app is a Vite/React single page app. That created four concrete problems, all
confirmed against `deploy/Caddyfile` and `frontend/index.html`:

1. **No crawlable page content.** `#root` is empty in the served HTML; every visible page
   (including all 299 problem pages) exists only after JavaScript runs. Google can render JS,
   but slowly and with limits, and many link previewers and other crawlers do not run it at
   all. So there was nothing to rank.
2. **`/robots.txt` and `/sitemap.xml` returned the HTML app.** Caddy's catch-all is
   `try_files {path} /index.html`. Because those two files did not exist in `dist`, every
   request for them fell through to `index.html` and came back as an HTML document. Search
   engines therefore had no robots rules and no sitemap at all.
3. **`og:image` was a relative path** (`/yzu-campus.jpg`). Open Graph needs an absolute URL.
   Relative images make the link preview (Facebook, LINE, Discord, iMessage) fail, which is
   exactly how CPE word of mouth spreads.
4. **One head for the whole site.** `index.html` carried a single title/description and no
   per-page `canonical`, `og`, `twitter`, `hreflang` or structured data, so problem pages had
   nothing distinctive to rank for.

## 2. Where the traffic actually is

CPE searches are overwhelmingly **Traditional Chinese**, plus UVa problem numbers, and this is
the largest growth lever. The queries to win:

- **`CPE 考古題`** (past exam problems), **`CPE 歷年題`**, **`CPE 考古題 解答`** — highest intent
  for practice; each of the 299 problem pages can target its own problem name.
- **`CPE 一顆星`** / **`CPE 一星 題目`** / **`CPE 一顆星 清單`** — the site's one star list angle is a
  strong, distinctive result for these.
- **`UVa 10055`**, **`UVa 10696`**, **`UVa 10189`** and so on — UVa numbers are searched directly.
  A page whose title, `og:title`, JSON-LD name and body all carry `UVa NNNN` plus the problem
  title can rank for those numbers.
- **`CPE 報名`**, **`CPE 元智`**, **`CPE 畢業`**, **`Collegiate Programming Exam 台灣`** — the
  registration and "what is the CPE" explainer already on the landing page can rank here.
- **`程式設計 检定`**, **`CPE 模擬考`** — the mock exam angle.

The 299 public problem pages are the compounding asset: each is a distinct, keyword-matched
page. Prerendering them is the single highest-leverage move.

## 3. What was implemented locally

### Real files Caddy will serve

Added by `backend/scripts/seo_prerender.py`, run after `npm run build`:

- `dist/robots.txt` — real rules (allow problem/mock/landing, disallow `/admin`, `/account`,
  `/submissions`, `/api/`, `/mock/`), plus an absolute `Sitemap:` line. Verified served as
  `200 text/plain`, not HTML.
- `dist/sitemap.xml` — 305 URLs (landing, `/problems`, `/mock`, `/privacy`, `/terms`, and all
  300 problem pages) with `http://` sitemap namespace (the `https://` namespace Google rejects),
  `changefreq`, `priority` and per-language `hreflang` alternates. Verified `200 application/xml`.

Because Caddy's catch-all only falls back to `index.html` when a file is **missing**, shipping
these as real files fixes the "robots and sitemap return the app" bug **with no Caddy change**.

### Prerendered problem pages

For every published problem the script writes a static `dist/problems/<id>/index.html` that
contains, in plain HTML a crawler can read without JavaScript:

- a localized title like `f91 - UVa 10696 · CPE 考古題練習 | YZU Judge`;
- a description that includes the difficulty, time and memory limits and the first words of the
  statement;
- a **`canonical`** and **`hreflang`** block (`?lang=en|zh|vi|ru|id` plus `x-default`);
- absolute **`og:url` / `og:image`** and `og:image:width/height`, plus `twitter:*` (so previews work);
- **JSON-LD** (`TechArticle` with name, statement text, UVa identifier, `isPartOf` the website),
  and an `ItemList` on `/problems` and `WebSite` + `Organization` on the landing page;
- the statement text and the sample input/output inside the `<main>`.

Caddy serves `/problems/123` as that prerendered file, then React takes over for real users, so
students still get the full app while crawlers see content. Verified: a browser that opened the
prerendered `/problems/1` loaded the app's code split chunks and mounted with **no console
errors**.

### Absolute OG and language alternates in the shell

`frontend/index.html` now ships absolute `canonical`, `og:url`, `og:image` and a `twitter` card
as a base for any page the prerenderer does not cover. `translate.ts` now honours `?lang=zh|vi|ru|
id|en` in the URL, so the `hreflang` alternates are real pages, not decorative links.

## 4. How to wire this into the real deploy

The generator needs the problem list, which lives in the database, while `web.Dockerfile` builds
the frontend without a database. Two clean options, both left as a recommendation here (not
applied, because this task is local only):

1. **Deploy-time prerender against the API.** On the server, after `npm run build` and once `api`
   is up, run `python -m scripts.seo_prerender` against the live data and write the results into
   the same volume Caddy serves (`/srv`). `scripts/seo_prerender.py` already queries the DB through
   the app models, so it runs in the `backend` container and just needs the shared `dist` output.
2. **Prerender in the frontend image using the API base.** Point the script at the running `api`
   service instead of the DB, run it in the build/entrypoint of `web`, and emit `dist`.

Either way the deploy command becomes: build frontend, run the prerender generator, start Caddy.
No Caddy rules need to change.

## 5. What to do next (priority order)

1. **Wire the prerender into deploy** (section 4) and submit `dist/robots.txt` + `sitemap.xml` in
   Google Search Console and Bing Webmaster Tools. This alone should start the problem pages
   indexing.
2. **Fix the title overwrite on hydration.** `I18nProvider` currently resets `document.title` to
   the site default on every route, which overrides the prerendered per-problem title for JS
   users (crawlers keep the good title). Add a per-page title hook so problem pages keep a UVa
   title in the browser tab and in social previews that do run JS.
3. **Build dedicated landing-style pages** that target the Chinese keywords as whole pages, not
   just problem titles: a "CPE 一顆星 完整清單" page and a "CPE 考古題 总表" page. These are the
   pages most likely to rank and get linked.
4. **Add hreflang and language-aware sitemaps for `zh-Hant` as the primary locale.** Since the
   growth lever is Chinese, make `zh-Hant` the `x-default`/primary and en/vi/ru/id alternates.
5. **Real 1200x630 OG artwork** per page type (currently reuses the campus photo). Custom OG
   images noticeably raise preview click-through for shared problem links.
6. **Internal linking + a problem sitemap index.** The `/problems` prerendered list already links
   every problem; keep it complete and consider splitting the sitemap into a sitemap index
   (problems, papers) once the count grows.
7. **Performance / Core Web Vitals.** The build warned that a chunk is over 500 kB. Splitting the
   editor and problem data code (already partly code split) helps mobile LCP, which feeds rankings.
8. **Structured data coverage.** Consider adding `BreadcrumbList` on every problem page and
   `FAQPage` on the landing FAQ to win rich results.

## 6. Verification done locally

- Built the production `dist`, ran `scripts/seo_prerender`, served `dist` over HTTP:
  - `/robots.txt` -> `200 text/plain` with a `Sitemap:` line (was HTML before).
  - `/sitemap.xml` -> `200 application/xml`, correct `http://` namespace, 305 `<url>` entries.
  - `/problems/1` -> `200 text/html` containing the `TechArticle` JSON-LD, `UVa 10696`, the
    statement text and absolute `og:image` (was an empty `#root` shell before).
  - `/problems` -> `200 text/html` with a link to every problem (crawlable).
  - `/` -> `200 text/html` with `WebSite` + `Organization` JSON-LD and a content shell.
- Opened the prerendered `/problems/1` in a browser: the React app mounted and fetched its code
  split chunks with **zero console errors**, confirming the shell does not break the live app.

Files touched by this task (all local, not committed, not pushed):
`frontend/index.html`, `frontend/src/i18n/translate.ts` (`?lang=` support), and the new
`backend/scripts/seo_prerender.py`.
