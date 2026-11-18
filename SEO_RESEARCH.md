# SEO research and implementation

Working notes for growing organic traffic to YZU Judge. This ships as PR #28, stacked on the
five-language branch (#27).

## 1. Diagnosis: why the site was invisible to search

The whole app is a Vite/React single page app. That created four concrete problems, all confirmed
against `deploy/Caddyfile` and `frontend/index.html`:

1. **No crawlable page content.** `#root` is empty in the served HTML; every visible page
   (including all 300 problem pages) exists only after JavaScript runs. Google can render JS, but
   slowly and with limits, and many link previewers and other crawlers do not run it at all.
2. **`/robots.txt` and `/sitemap.xml` returned the HTML app.** Caddy's catch-all is
   `try_files {path} /index.html`. Because those two files did not exist in `dist`, every request
   for them fell through to `index.html` and came back as an HTML document.
3. **`og:image` was a relative path** (`/yzu-campus.jpg`). Open Graph needs an absolute URL, so
   link previews (Facebook, LINE, Discord, iMessage) failed, which is exactly how CPE word of mouth
   spreads.
4. **One head for the whole site.** `index.html` carried a single title/description and no
   per-page `canonical`, `og`, `twitter` or structured data, so problem pages had nothing
   distinctive to rank for.

## 2. Where the traffic actually is

CPE searches are overwhelmingly **Traditional Chinese**, plus UVa problem numbers, and this is the
largest growth lever. The queries to win:

- **`CPE 考古題`** (past exam problems), **`CPE 歷年題`**, **`CPE 考古題 解答`** — highest intent
  for practice; each of the 300 problem pages can target its own problem name.
- **`CPE 一顆星`** / **`CPE 一星 題目`** / **`CPE 一顆星 清單`** — the site's one star list angle is
  a strong, distinctive result for these.
- **`UVa 10055`**, **`UVa 10696`**, **`UVa 10189`** and so on — UVa numbers are searched directly.
  A page whose title, `og:title`, JSON-LD name and body all carry `UVa NNNN` plus the problem title
  can rank for those numbers.
- **`CPE 報名`**, **`CPE 元智`**, **`CPE 畢業`**, **`Collegiate Programming Exam 台灣`** — the
  registration and "what is the CPE" explainer already on the landing page can rank here.
- **`程式設計 检定`**, **`CPE 模擬考`** — the mock exam angle.

The 300 public problem pages are the compounding asset: each is a distinct, keyword-matched page.
Prerendering them is the single highest-leverage move.

## 3. What is implemented

### Real files Caddy will serve

Added by `backend/scripts/seo_prerender.py`, run after `npm run build`:

- `dist/robots.txt` — real rules plus an absolute `Sitemap:` line. No blanket `Disallow`, so every
  public page is crawlable by default; only `/admin`, `/account`, `/submissions`, the auth pages
  and `/api/` are closed. Served as `200 text/plain`.
- `dist/sitemap.xml` — 305 URLs (landing, `/problems`, `/mock`, `/privacy`, `/terms`, and all 300
  problem pages) with the `http://` sitemap namespace. **Validates against the official
  `sitemap.xsd`** (`xmllint --schema`), which the first draft did not: element order must be
  `loc, lastmod, changefreq, priority`, and the draft put `xhtml:link` before `changefreq`.
  `lastmod` is deliberately omitted — problems do not track an update time, and a build-date
  `lastmod` that changes on every deploy teaches Google to ignore the field.

### One line of Caddy

`deploy/Caddyfile` changes the catch-all from `try_files {path} /index.html` to:

```
try_files {path}/index.html {path} /app.html /index.html
```

This is not cosmetic. Caddy's `try_files` only matches a directory when the candidate **ends in a
slash** (`fileserver/matcher.go`, `strictFileExists`: a path without a trailing separator must not
be a directory). So with `{path}` alone, `/problems/1` is a directory, does not match, and falls
back to the app shell — every prerendered page would be invisible to crawlers while looking fine
in `dist`. The first candidate fixes that. Verified against a real Caddy 2.11 container running
this exact Caddyfile: `/problems/1`, `/problems`, `/mock`, `/privacy`, `/terms` all return `200`
with their own title, `/robots.txt` is `text/plain`, `/sitemap.xml` is `text/xml`, and `/register`
still falls back to the app.

### Prerendered problem pages

For every published problem the script writes a static `dist/problems/<id>/index.html` that
contains, in plain HTML a crawler can read without JavaScript:

- `<html lang="zh-Hant-TW">` — the shell is Chinese, so it says so. (The first draft left the
  template's `lang="en"`, which told Google the Chinese page was English.)
- a title like `f91 - UVa 10696 · CPE 考古題練習 | YZU Judge`;
- a description under 160 characters with the difficulty, the limits and the start of the
  statement;
- a **`canonical`** matching the URL that is actually served, plus absolute **`og:url` /
  `og:image`** with correct `og:image:width/height` (1200×630, see below), `og:locale` and
  `twitter:*`, so previews render;
- **JSON-LD**: `TechArticle` with the UVa identifier, `isPartOf` the website, and a
  `BreadcrumbList`; `ItemList` on `/problems`; `WebSite` + `Organization` on the landing page.
  Empty properties are dropped instead of emitted as `null`.
- the statement as plain prose (markdown fences, links and emphasis stripped) and the sample
  input/output, plus links to every other public page.

### No hreflang, on purpose

The first draft emitted `hreflang` alternates for all five languages pointing at `?lang=`. That was
wrong twice over: a static file cannot answer a query string, so every "language version" served
the same Chinese HTML, and the canonical on those URLs pointed back at the bare URL, which makes
Google discard the whole cluster. The app still honours `?lang=` in the browser (useful for
shareable links), but the crawlable page is one `zh-Hant` document with one canonical. Real
per-language URLs would need path prefixes (`/en/problems/1`) and are a separate project.

### Per-page titles survive React

`I18nProvider` used to set `document.title` to the site default on mount, which overwrote the
prerendered per-problem title in any renderer that runs JavaScript — including Googlebot. Now
`lib/documentTitle.ts` lets a page claim the title: `ProblemWorkspace` claims it while loading
(leaving the prerendered one in place) and sets `UVa NNNN · Title · YZU Judge` once the problem
arrives. The provider only writes the default while nobody owns it.

### OG artwork

`frontend/public/og-cover.jpg` is a 1200×630 crop of the campus photo. The first draft declared
1200×630 but shipped the 1434×1142 original, so the declared size was a lie and `summary_large_image`
would crop badly.

## 4. How to wire this into the real deploy

The generator needs the problem list, which lives in the database, while `web.Dockerfile` builds the
frontend without a database. Two clean options:

1. **Deploy-time prerender against the DB.** After `npm run build` and once `api` is up, run
   `python -m scripts.seo_prerender` in the `backend` container and write the results into the same
   volume Caddy serves (`/srv`). The script already queries the DB through the app models.
2. **Prerender in the frontend image using the API base.** Point the script at the running `api`
   service instead of the DB, run it in the build/entrypoint of `web`, and emit `dist`.

Either way the deploy command becomes: build frontend, run the prerender generator, start Caddy.
`SITE_ADDRESS` must be set — the script now refuses to run without it instead of quietly writing
`https://localhost` into every canonical.

## 5. What to do next (priority order)

1. **Wire the prerender into deploy** (section 4) and submit `robots.txt` + `sitemap.xml` in Google
   Search Console and Bing Webmaster Tools. This alone should start the problem pages indexing.
2. **Build dedicated landing-style pages** that target the Chinese keywords as whole pages, not just
   problem titles: a "CPE 一顆星 完整清單" page and a "CPE 考古題 總表" page. These are the pages
   most likely to rank and get linked.
3. **Per-language URLs** (`/en/...`, `/vi/...`) if the non-Chinese audiences matter for search; that
   is what would make `hreflang` honest.
4. **Track `updated_at` on problems** so the sitemap can carry a real `lastmod`.
5. **Per-page OG artwork.** One campus photo for 305 pages works but does not stand out in a feed.
6. **Sitemap index** once the URL count grows past a few thousand.
7. **Performance / Core Web Vitals.** The build warns that a chunk is over 500 kB. Splitting the
   editor and problem data code helps mobile LCP, which feeds rankings.
8. **`FAQPage` on the landing FAQ** to win a rich result.

## 6. Verification

Against a real Caddy 2.11 container running `deploy/Caddyfile` (site address swapped to `:80`) and
the generated `dist`:

| URL | Result |
| --- | --- |
| `/problems/1` | `200`, per-problem title, `TechArticle` + `BreadcrumbList` |
| `/problems` | `200`, list title, links to all 300 problems |
| `/` | `200`, `WebSite` + `Organization` |
| `/mock`, `/privacy`, `/terms` | `200`, own titles |
| `/robots.txt` | `200 text/plain` |
| `/sitemap.xml` | `200 text/xml`, 305 URLs, validates against `sitemap.xsd` |
| `/register`, unknown paths | `200`, app shell (React Router) |

Also checked on the generated HTML: `lang="zh-Hant-TW"`, no `hreflang`, description ≤160 characters,
no raw markdown in the article, `identifier` omitted when a problem has no UVa number, and the
`I18nProvider` no longer clobbers the per-problem title.
