"""Make the site crawlable: a real robots.txt, a real sitemap.xml, and a prerendered HTML shell
for every public problem page, the problems list and the landing page.

The app is a React SPA, so on its own Google only sees an empty page, /robots.txt and /sitemap.xml
fall back to the HTML, and og:image is a relative path. This script fills all three so a student
searching "CPE 考古題", "CPE 一顆星" or a UVa number can find the matching problem page.

Run after a production build (npm run build), from backend/:

    python -m scripts.seo_prerender

It rewrites frontend/dist/index.html in place and adds dist/problems/.../index.html files. Caddy
already serves these as real files (its catch-all only falls back to index.html when a file is
missing), so no Caddy change is needed.

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

# Our language codes and the BCP-47 tag used in hreflang / og:locale.
LANGS = [("en", "en"), ("zh", "zh-Hant"), ("vi", "vi"), ("ru", "ru"), ("id", "id")]


def site_base() -> str:
    base = os.getenv("SEO_BASE") or f"https://{os.getenv('SITE_ADDRESS', 'localhost')}"
    return base.rstrip("/")


def esc(text: str) -> str:
    return htmlmod.escape(str(text), quote=True)


def plain(text: str, limit: int) -> str:
    """Statement markdown to a short crawlable sentence: drop fences and links, keep the words."""
    stripped = re.sub(r"```.*?```", " ", text, flags=re.S)
    stripped = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", stripped)
    stripped = re.sub(r"[#>*_`]", " ", stripped)
    stripped = re.sub(r"\s+", " ", stripped).strip()
    if len(stripped) > limit:
        stripped = stripped[: limit - 1].rstrip() + "…"
    return stripped


# --- head block builders -------------------------------------------------------------

def hreflang_links(base: str, path: str) -> str:
    lines = [f'    <link rel="alternate" hreflang="{tag}" href="{base}{path}?lang={code}" />' for code, tag in LANGS]
    lines.append(f'    <link rel="alternate" hreflang="x-default" href="{base}{path}" />')
    return "\n".join(lines)


def ld_graph(*nodes: dict) -> str:
    body = nodes[0] if len(nodes) == 1 else {"@context": "https://schema.org", "@graph": list(nodes)}
    if len(nodes) == 1:
        body.setdefault("@context", "https://schema.org")
    return "    <script type=\"application/ld+json\">" + json.dumps(body, ensure_ascii=False) + "</script>"


def set_tag(html: str, pattern: str, replacement: str) -> str:
    return re.sub(pattern, replacement, html, count=1, flags=re.S)


def build_head(template: str, *, path: str, title: str, description: str, og_type: str,
               jsonld: str, extra_head: str = "") -> str:
    base = site_base()
    url = base + path
    page = template

    page = set_tag(page, r"<title>.*?</title>", f"<title>{esc(title)}</title>")
    page = set_tag(page, r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + esc(description) + m.group(2))
    page = set_tag(page, r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2))
    page = set_tag(page, r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + url + m.group(2))
    page = set_tag(page, r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + esc(title) + m.group(2))
    page = set_tag(page, r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + esc(description) + m.group(2))
    page = set_tag(page, r'(<meta property="og:type" content=")[^"]*(")', lambda m: m.group(1) + og_type + m.group(2))
    page = set_tag(page, r'(<meta property="og:image" content=")[^"]*(")', lambda m: m.group(1) + base + "/yzu-campus.jpg" + m.group(2))

    inject = "\n".join(
        [
            hreflang_links(base, path),
            '    <meta property="og:image:width" content="1200" />',
            '    <meta property="og:image:height" content="630" />',
            '    <meta name="twitter:title" content="%s" />' % esc(title),
            '    <meta name="twitter:description" content="%s" />' % esc(description),
            '    <meta name="twitter:image" content="%s/yzu-campus.jpg" />' % base,
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
            "<h3>Sample {n} input</h3><pre>{inp}</pre><h3>Sample {n} output</h3><pre>{outp}</pre>".format(
                n=index, inp=esc(data[:2000]), outp=esc(expected[:2000])
            )
        )
    return "\n".join(out)


def problem_page_html(problem: Problem, db) -> tuple[str, str]:
    base = site_base()
    path = f"/problems/{problem.id}"
    uva = f"UVa {problem.uva_id}" if problem.uva_id else "YZU Judge"
    title = f"{problem.title} - {uva} · CPE 考古題練習 | YZU Judge"
    statement = plain(problem.description, 320)
    description = (
        f"{problem.title} ({uva}) 是 CPE 考古題。難度 {problem.difficulty}，"
        f"時間 {problem.time_limit_ms} ms、記憶體 {problem.memory_limit_mb} MB。"
        f"{statement}"
    )
    jsonld = ld_graph(
        {
            "@type": "TechArticle",
            "name": f"{problem.title} ({uva})",
            "description": statement,
            "url": base + path,
            "inLanguage": "zh-Hant",
            "isPartOf": {"@id": base + "/#website"},
            "about": [
                {
                    "@type": "DefinedTerm",
                    "name": problem.difficulty,
                }
            ],
            "identifier": ({"@type": "PropertyValue", "propertyID": "UVa", "value": str(problem.uva_id)} if problem.uva_id else None),
        }
    )

    topics = "".join(f"<li>{esc(t)}</li>" for t in (problem.topics or []))
    body = (
        "<main>"
        f"<nav aria-label='Breadcrumb'><a href='{base}/problems'>CPE 題目</a> › "
        f"<a href='{base}/'>YZU Judge</a></nav>"
        f"<h1>{esc(problem.title)}</h1>"
        f"<p>{esc(uva)} · 難度 {esc(problem.difficulty)} · 時間 {problem.time_limit_ms} ms · "
        f"記憶體 {problem.memory_limit_mb} MB · CPE 考古題 · 一顆星練習</p>"
        f"<article><h2>題目敘述</h2><div style='white-space:pre-wrap'>{esc(problem.description)}</div></article>"
        + (f"<section><h2>主題</h2><ul>{topics}</ul></section>" if topics else "")
        + f"<section><h2>輸入 / 輸出 範例</h2>{sample_blocks(problem.id, db)}</section>"
        f"<p><a href='{base}/problems/{problem.id}'>在 YZU Judge 練習這題，取得即時判定</a></p>"
        "</main>"
    )

    head = build_head(
        TEMPLATE_TEXT, path=path, title=title, description=description,
        og_type="article", jsonld=jsonld,
    )
    return with_body(head, body), path


# --- sitemap / robots ----------------------------------------------------------------

def build_sitemap(paths: list[tuple[str, str, str]]) -> str:
    base = site_base()
    items = []
    for path, lastmod, priority in paths:
        alternates = "\n".join(
            f'      <xhtml:link rel="alternate" hreflang="{tag}" href="{base}{path}?lang={code}" />'
            for code, tag in LANGS
        )
        items.append(
            "  <url>\n"
            f"    <loc>{base}{path}</loc>\n"
            f"    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"{base}{path}\" />\n"
            f"{alternates}\n"
            f"    <changefreq>weekly</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            + (f"    <lastmod>{lastmod}</lastmod>\n" if lastmod else "")
            + "  </url>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(items)
        + "\n</urlset>\n"
    )


def build_robots() -> str:
    base = site_base()
    return (
        "User-agent: *\n"
        "Allow: /$\n"
        "Allow: /problems\n"
        "Allow: /mock\n"
        "Allow: /privacy\n"
        "Allow: /terms\n"
        "Disallow: /admin\n"
        "Disallow: /account\n"
        "Disallow: /submissions\n"
        "Disallow: /api/\n"
        "Disallow: /mock/\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )


TEMPLATE_TEXT = ""


def main() -> None:
    if not TEMPLATE.exists():
        raise SystemExit("frontend/dist/index.html not found. Run `npm run build` in frontend/ first.")

    global TEMPLATE_TEXT
    TEMPLATE_TEXT = TEMPLATE.read_text(encoding="utf-8")

    db = SessionLocal()
    base = site_base()
    today = "2026-11-16"

    published = db.query(Problem).filter(Problem.is_published == True).order_by(Problem.sort_order.desc(), Problem.id).all()
    print(f"Prerendering {len(published)} published problems into {DIST}")

    written = []

    # Each public problem page.
    for problem in published:
        page_html, path = problem_page_html(problem, db)
        target = DIST / f"problems/{problem.id}/index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page_html, encoding="utf-8")
        written.append((path, today, "0.7"))

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
        with_body(build_head(TEMPLATE_TEXT, path="/problems", title=list_title, description=list_desc, og_type="website", jsonld=list_jsonld), list_body),
        encoding="utf-8",
    )
    written.append(("/problems", today, "0.8"))

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
            "inLanguage": [tag for _code, tag in LANGS],
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
                TEMPLATE_TEXT, path="/",
                title="YZU Judge · 練習 CPE，趁它還沒有影響畢業",
                description="元智大學免費 CPE 練習 judge。用過去 CPE 考古題練習，幾秒取得判定，按時通過 Collegiate Programming Exam。",
                og_type="website", jsonld=landing_jsonld,
            ),
            landing_body,
        ),
        encoding="utf-8",
    )
    written.append(("/", today, "1.0"))

    # Simple crawlable shells for the other static pages so they are not empty either.
    for path, title, desc, body_text in [
        ("/mock", "模擬 CPE · 完整過去考試 | YZU Judge", "在完全相同的 3 小時、相同題序下做過去 CPE 考古題。", "模擬 CPE"),
        ("/privacy", "隱私權政策 | YZU Judge", "YZU Judge 儲存哪些資料、為什麼，以及如何刪除你的帳號。", "隱私權政策"),
        ("/terms", "使用條款 | YZU Judge", "YZU Judge 的使用條款：請提交自己的解答，不要攻擊系統。", "使用條款"),
    ]:
        page = build_head(
            TEMPLATE_TEXT, path=path, title=title, description=desc, og_type="webpage",
            jsonld=ld_graph({"@type": "WebPage", "name": title, "url": base + path}),
        )
        (DIST / path.lstrip("/")).mkdir(parents=True, exist_ok=True)
        (DIST / path.lstrip("/") / "index.html").write_text(
            with_body(page, f"<main><h1>{esc(title)}</h1><p>{esc(body_text)}</p></main>"), encoding="utf-8",
        )
        written.append((path, today, "0.4"))

    # Real robots.txt and sitemap.xml as actual files, so Caddy serves them instead of the app shell.
    (DIST / "robots.txt").write_text(build_robots(), encoding="utf-8")
    (DIST / "sitemap.xml").write_text(build_sitemap(sorted(written)), encoding="utf-8")

    db.close()
    print(f"Wrote {len(written)} sitemap URLs, robots.txt and prerendered HTML under {DIST}")


if __name__ == "__main__":
    main()
