"""Make the site crawlable: a real robots.txt, a real sitemap.xml, and a prerendered HTML shell
for every public problem page, the problems list and the landing page.

The app is a React SPA, so on its own Google only sees an empty page, /robots.txt and /sitemap.xml
fall back to the HTML, and og:image is a relative path. This script fills all three so a student
searching "CPE 考古題", "CPE 一顆星" or a UVa number can find the matching problem page.

Run after a production build (npm run build), from backend/:

    python -m scripts.seo_prerender

It first saves the untouched build output as frontend/dist/app.html, then rewrites
dist/index.html as the landing page and adds dist/problems/.../index.html files. Caddy serves
these as real files; the one line that makes that work is the catch-all
`try_files {path}/index.html {path} /app.html /index.html` in deploy/Caddyfile (see below).

Two details that are easy to get wrong and are handled here on purpose:

- The pages are written as directories (dist/problems/1/index.html) and served with a Caddyfile
  whose catch-all is `try_files {path}/index.html {path} /app.html /index.html`. The first candidate is what
  makes them reachable: `try_files {path}` alone only matches a directory when the candidate ends
  in a slash, so `/problems/1` would skip the prerendered file and fall back to the app shell,
  hiding every page from crawlers. With both candidates, `/problems/1` and `/problems/1/` both
  return the page and the canonical picks one.
- Every other path (/register, /submissions/5, unknown ones) must get the plain app shell, not the
  landing page. dist/index.html becomes the landing page, so the pristine shell is kept as
  dist/app.html and the catch-all falls back to it. /index.html stays last so a build that never
  ran this script still works. Rerunning the script reads app.html, so it is safe to repeat.
- The shells are Traditional Chinese and nothing else. There is no hreflang block: the app can
  switch language in the browser (?lang=), but a static file cannot answer a query string, so all
  five "language versions" would have served identical Chinese HTML. Declaring them as alternates
  would have been a lie Google discards, so the page is simply one zh-Hant document.

Absolute URLs come from SITE_ADDRESS (or SEO_BASE to override, e.g. https://yzujudge.com).
"""

import html as htmlmod
import json
import os
import re
from pathlib import Path

from app.database import SessionLocal
from app.models.problem import Problem
from app.models.testcase import TestCase
from app.storage import read_file

FRONTEND = Path(__file__).resolve().parent.parent.parent / "frontend"
DIST = FRONTEND / "dist"
TEMPLATE = DIST / "index.html"
# The untouched SPA shell. Caddy falls back to it for every path without its own page.
APP_SHELL = DIST / "app.html"

# The prerendered shells are Traditional Chinese, which is where the search traffic is.
PAGE_LANG = "zh-Hant-TW"
OG_LOCALE = "zh_TW"
OG_IMAGE = "/og-cover.jpg"
OG_IMAGE_WIDTH = 1200
OG_IMAGE_HEIGHT = 630


def site_base() -> str:
    base = os.getenv("SEO_BASE") or os.getenv("SITE_ADDRESS")
    if not base:
        # A silent https://localhost here would poison every canonical and the sitemap.
        raise SystemExit("Set SITE_ADDRESS (or SEO_BASE) to the public origin, e.g. yzujudge.com.")
    if "://" not in base:
        base = "https://" + base
    return base.rstrip("/")


def esc(text: str) -> str:
    return htmlmod.escape(str(text), quote=True)


def plain(text: str, limit: int | None = None) -> str:
    """Statement markdown to crawlable prose: drop fences and links, keep the words."""
    stripped = re.sub(r"```.*?```", " ", text, flags=re.S)
    stripped = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", stripped)
    stripped = re.sub(r"[#>*_`]", " ", stripped)
    stripped = re.sub(r"\s+", " ", stripped).strip()
    if limit is not None and len(stripped) > limit:
        stripped = stripped[: limit - 1].rstrip() + "…"
    return stripped


def without_none(value):
    """schema.org validators dislike nulls, so drop empty properties instead of emitting them."""
    if isinstance(value, dict):
        return {key: without_none(item) for key, item in value.items() if item is not None}
    if isinstance(value, list):
        return [without_none(item) for item in value]
    return value


# --- head block builders -------------------------------------------------------------

def ld_graph(*nodes: dict) -> str:
    cleaned = [without_none(node) for node in nodes]
    body = cleaned[0] if len(cleaned) == 1 else {"@context": "https://schema.org", "@graph": cleaned}
    if len(cleaned) == 1:
        body.setdefault("@context", "https://schema.org")
    # Escape "<" so text from a problem (e.g. "</script>") cannot close the tag early.
    payload = json.dumps(body, ensure_ascii=False).replace("<", "\\u003c")
    return "    <script type=\"application/ld+json\">" + payload + "</script>"


def set_tag(html: str, pattern: str, replacement: str) -> str:
    return re.sub(pattern, replacement, html, count=1, flags=re.S)


def build_head(template: str, *, path: str, title: str, description: str, og_type: str,
               jsonld: str, extra_head: str = "") -> str:
    base = site_base()
    url = base + path
    page = template

    # The template is English; every shell this script writes is Chinese. Google reads this.
    page = set_tag(page, r"<html[^>]*>", f'<html lang="{PAGE_LANG}">')
    page = set_tag(page, r"<title>.*?</title>", f"<title>{esc(title)}</title>")
    page = set_tag(page, r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + esc(description) + m.group(2))
    page = set_tag(page, r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2))
    page = set_tag(page, r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + url + m.group(2))
    page = set_tag(page, r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + esc(title) + m.group(2))
    page = set_tag(page, r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + esc(description) + m.group(2))
    page = set_tag(page, r'(<meta property="og:type" content=")[^"]*(")', lambda m: m.group(1) + og_type + m.group(2))
    page = set_tag(page, r'(<meta property="og:image" content=")[^"]*(")', lambda m: m.group(1) + base + OG_IMAGE + m.group(2))

    inject = "\n".join(
        [
            '    <meta property="og:locale" content="%s" />' % OG_LOCALE,
            '    <meta property="og:image:width" content="%d" />' % OG_IMAGE_WIDTH,
            '    <meta property="og:image:height" content="%d" />' % OG_IMAGE_HEIGHT,
            '    <meta property="og:image:alt" content="%s" />' % esc("元智大學校門與 YZU Judge 標誌"),
            '    <meta name="twitter:title" content="%s" />' % esc(title),
            '    <meta name="twitter:description" content="%s" />' % esc(description),
            '    <meta name="twitter:image" content="%s%s" />' % (base, OG_IMAGE),
            jsonld,
        ]
    )
    if extra_head:
        inject += "\n" + extra_head
    page = re.sub(r"</head>", inject + "\n  </head>", page, count=1)
    return page


def with_body(html: str, body_html: str) -> str:
    return html.replace('<div id="root"></div>', '<div id="root">' + body_html + "</div>", 1)


# --- body shells ---------------------------------------------------------------------

def sample_blocks(problem_id: int, db) -> str:
    samples = (
        db.query(TestCase)
        .filter(TestCase.problem_id == problem_id, TestCase.is_sample == True)
        .order_by(TestCase.sample_order, TestCase.id)
        .all()
    )
    out = []
    for index, sample in enumerate(samples, start=1):
        try:
            data = read_file(sample.input_path)
            expected = read_file(sample.output_path)
        except OSError:
            continue
        out.append(
            "<h3>範例 {n} 輸入</h3><pre>{inp}</pre><h3>範例 {n} 輸出</h3><pre>{outp}</pre>".format(
                n=index, inp=esc(data[:2000]), outp=esc(expected[:2000])
            )
        )
    return "\n".join(out)


def problem_page_html(problem: Problem, db, template: str) -> tuple[str, str]:
    base = site_base()
    # Trailing slash: this is the URL Caddy serves without a redirect, so it is the canonical.
    path = f"/problems/{problem.id}"
    uva = f"UVa {problem.uva_id}" if problem.uva_id else "YZU Judge"
    title = f"{problem.title} - {uva} · CPE 考古題練習 | YZU Judge"

    prefix = (
        f"{problem.title}（{uva}）CPE 考古題。難度 {problem.difficulty}，"
        f"時間 {problem.time_limit_ms} ms，記憶體 {problem.memory_limit_mb} MB。"
    )
    # Google shows roughly 155 characters of a description; longer is cut, not shown.
    description = plain(prefix + plain(problem.description), 160)
    statement = plain(problem.description)

    jsonld = ld_graph(
        {
            "@type": "TechArticle",
            "name": f"{problem.title} ({uva})",
            "description": plain(problem.description, 200),
            "url": base + path,
            "inLanguage": PAGE_LANG,
            "isPartOf": {"@id": base + "/#website"},
            "about": [{"@type": "DefinedTerm", "name": problem.difficulty}],
            "identifier": (
                {"@type": "PropertyValue", "propertyID": "UVa", "value": str(problem.uva_id)}
                if problem.uva_id
                else None
            ),
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "YZU Judge", "item": base + "/"},
                {"@type": "ListItem", "position": 2, "name": "CPE 題目", "item": base + "/problems/"},
                {"@type": "ListItem", "position": 3, "name": problem.title, "item": base + path},
            ],
        },
    )

    topics = "".join(f"<li>{esc(t)}</li>" for t in (problem.topics or []))
    body = (
        "<main>"
        f"<nav aria-label='Breadcrumb'><a href='{base}/problems'>CPE 題目</a> › "
        f"<a href='{base}/'>YZU Judge</a></nav>"
        f"<h1>{esc(problem.title)}</h1>"
        f"<p>{esc(uva)} · 難度 {esc(problem.difficulty)} · 時間 {problem.time_limit_ms} ms · "
        f"記憶體 {problem.memory_limit_mb} MB · CPE 考古題 · 一顆星練習</p>"
        f"<article><h2>題目敘述</h2><p>{esc(statement)}</p></article>"
        + (f"<section><h2>主題</h2><ul>{topics}</ul></section>" if topics else "")
        + f"<section><h2>輸入 / 輸出 範例</h2>{sample_blocks(problem.id, db)}</section>"
        f"<p><a href='{base}{path}'>在 YZU Judge 練習這題，取得即時判定</a></p>"
        "</main>"
    )

    head = build_head(
        template, path=path, title=title, description=description,
        og_type="article", jsonld=jsonld,
    )
    return with_body(head, body), path


# --- sitemap / robots ----------------------------------------------------------------

def build_sitemap(paths: list[tuple[str, str]]) -> str:
    """paths is (path, priority). Element order matters: the sitemap XSD wants loc, lastmod,
    changefreq, priority, and any xhtml:link after them, so this stays in that order.

    lastmod is left out on purpose: problems do not track an update time, and a build-date
    lastmod that changes on every deploy teaches Google to ignore the field."""
    base = site_base()
    items = []
    for path, priority in paths:
        items.append(
            "  <url>\n"
            f"    <loc>{base}{path}</loc>\n"
            "    <changefreq>weekly</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            "  </url>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(items)
        + "\n</urlset>\n"
    )


def build_robots() -> str:
    base = site_base()
    # No blanket Disallow, so every public page is crawlable by default and only the
    # signed-in surfaces and the API are closed.
    return (
        "User-agent: *\n"
        "Disallow: /admin\n"
        "Disallow: /account\n"
        "Disallow: /submissions\n"
        "Disallow: /login\n"
        "Disallow: /register\n"
        "Disallow: /forgot-password\n"
        "Disallow: /verify-email\n"
        "Disallow: /api/\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )


def main() -> None:
    if not TEMPLATE.exists():
        raise SystemExit("frontend/dist/index.html not found. Run `npm run build` in frontend/ first.")

    # Keep the build's own shell before index.html is rewritten as the landing page. On a rerun
    # app.html already holds it, and index.html is the previous landing page, so read app.html.
    if not APP_SHELL.exists():
        APP_SHELL.write_text(TEMPLATE.read_text(encoding="utf-8"), encoding="utf-8")
    template = APP_SHELL.read_text(encoding="utf-8")

    db = SessionLocal()
    base = site_base()

    published = db.query(Problem).filter(Problem.is_published == True).order_by(Problem.sort_order.desc(), Problem.id).all()
    print(f"Prerendering {len(published)} published problems into {DIST}")

    written: list[tuple[str, str]] = []

    # Each public problem page.
    for problem in published:
        page_html, path = problem_page_html(problem, db, template)
        target = DIST / f"problems/{problem.id}/index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page_html, encoding="utf-8")
        written.append((path, "0.7"))

    # The problems list, with every problem linked so a crawler can reach them all.
    list_links = "".join(
        f"<li><a href='{base}/problems/{p.id}'>UVa {p.uva_id} — {esc(p.title)}</a> ({esc(p.difficulty)})</li>"
        for p in published
    )
    list_title = "CPE 考古題題目清單 · 過去 CPE 試題練習 | YZU Judge"
    list_desc = f"YZU Judge 收錄 {len(published)} 題 CPE 考古題，依難度排列，可在線練習並取得即時判定。"
    list_body = (
        "<main>"
        f"<h1>CPE 考古題練習（{len(published)} 題）</h1>"
        f"<p>過去 CPE 歷年試題與 UVa Online Judge 題目，依 easy、medium、hard 排序，含一顆星清單練習。</p>"
        f"<ul>{list_links}</ul>"
        "</main>"
    )
    list_jsonld = ld_graph(
        {
            "@type": "ItemList",
            "name": "CPE 考古題練習",
            "itemListElement": [
                {"@type": "ListItem", "position": index + 1, "url": base + f"/problems/{p.id}", "name": p.title}
                for index, p in enumerate(published)
            ],
        }
    )
    (DIST / "problems/index.html").write_text(
        with_body(build_head(template, path="/problems", title=list_title, description=list_desc, og_type="website", jsonld=list_jsonld), list_body),
        encoding="utf-8",
    )
    written.append(("/problems", "0.8"))

    # Landing page: give crawlers the same key sentences the browser renders.
    landing_body = (
        "<main>"
        "<h1>為元智大學準備 CPE</h1>"
        "<p>YZU Judge 讓你在正式上場前用 CPE 考古題練習，系統像正式考試一樣判定你的程式碼。"
        "CPE 考古題、CPE 一顆星清單、UVa Online Judge 題目都可以線上練習並取得即時判定。</p>"
        f"<nav><a href='{base}/problems'>題目</a> · <a href='{base}/mock'>模擬 CPE</a> · <a href='{base}/register'>建立免費帳號</a></nav>"
        "</main>"
    )
    landing_jsonld = ld_graph(
        {
            "@type": "WebSite",
            "@id": base + "/#website",
            "name": "YZU Judge",
            "url": base + "/",
            "inLanguage": PAGE_LANG,
            "potentialAction": {
                "@type": "SearchAction",
                "target": base + "/problems?q={search_term_string}",
                "query-input": "required name=search_term_string",
            },
        },
        {
            "@type": "Organization",
            "@id": base + "/#organization",
            "name": "YZU Judge",
            "url": base + "/",
            "logo": base + "/ibpi-emblem.svg",
        },
    )
    (DIST / "index.html").write_text(
        with_body(
            build_head(
                template, path="/",
                title="YZU Judge · 練習 CPE，趁它還沒有影響畢業",
                description="元智大學免費 CPE 練習 judge。用過去 CPE 考古題練習，幾秒取得判定，按時通過 Collegiate Programming Exam。",
                og_type="website", jsonld=landing_jsonld,
            ),
            landing_body,
        ),
        encoding="utf-8",
    )
    written.append(("/", "1.0"))

    # Simple crawlable shells for the other static pages so they are not empty either.
    for path, title, desc, body_text in [
        ("/mock", "模擬 CPE · 完整過去考試 | YZU Judge", "在完全相同的 3 小時、相同題序下做過去 CPE 考古題。", "模擬 CPE"),
        ("/learn", "學習 CPE 需要的 Python 與 C++ | YZU Judge", "輸入輸出、迴圈、陣列、字串、排序、map 與遞迴的短課程，每一課都有 Python 和 C++ 範例與練習題。", "學習"),
        ("/privacy", "隱私權政策 | YZU Judge", "YZU Judge 儲存哪些資料、為什麼，以及如何刪除你的帳號。", "隱私權政策"),
        ("/terms", "使用條款 | YZU Judge", "YZU Judge 的使用條款：請提交自己的解答，不要攻擊系統。", "使用條款"),
    ]:
        page = build_head(
            template, path=path, title=title, description=desc, og_type="webpage",
            jsonld=ld_graph({"@type": "WebPage", "name": title, "url": base + path}),
        )
        (DIST / path.strip("/")).mkdir(parents=True, exist_ok=True)
        (DIST / path.strip("/") / "index.html").write_text(
            with_body(page, f"<main><h1>{esc(title)}</h1><p>{esc(body_text)}</p></main>"), encoding="utf-8",
        )
        written.append((path, "0.4"))

    # Real robots.txt and sitemap.xml as actual files, so Caddy serves them instead of the app shell.
    (DIST / "robots.txt").write_text(build_robots(), encoding="utf-8")
    (DIST / "sitemap.xml").write_text(build_sitemap(sorted(written)), encoding="utf-8")

    db.close()
    print(f"Wrote {len(written)} sitemap URLs, robots.txt and prerendered HTML under {DIST}")


if __name__ == "__main__":
    main()
