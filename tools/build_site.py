#!/usr/bin/env python3
"""Generate plain HTML pages from FOUNDING-THEOLOGY.md.

The pages are generated from FOUNDING-THEOLOGY.md. styles.css and site.js hold the visual identity.
"""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "FOUNDING-THEOLOGY.md"

NAV = [
    ("index.html", "Home", "home"),
    ("confession.html", "Confession", "confession"),
    ("theology/index.html", "Theology", "theology"),
    ("practice.html", "Practice", "practice"),
    ("belonging.html", "Belonging", "belonging"),
    ("receiving.html", "Receiving other faiths", "receiving"),
    ("public-life.html", "Public life", "public"),
]

HELD_MARKERS = [
    "explicitly tagged fiction and in-progress",
    "receive four IntelOasis traditions as practices, not sacraments",
    "recognize elders as lamps",
    "establish no magisterium",
    "open collection of originating witnesses",
    "detailed reproductive theology is unfinished",
    "not as a political document, not as a new religion",
    "not the spiritual department of The Formation Party",
    "claim no official church registration",
    "do not resolve that question by quietly deleting one account",
    "French, Brazilian, Italian, Korean",
]


def parse_theology(text: str) -> dict:
    preamble: list[str] = []
    parts: list[dict] = []
    subtitle = ""
    section: tuple | None = None

    def add_paragraph(paragraph: str) -> None:
        nonlocal subtitle
        if section is None:
            if paragraph.startswith("*") and paragraph.endswith("*") and not subtitle:
                subtitle = paragraph.strip("*").strip()
            return
        kind = section[0]
        if kind == "preamble":
            preamble.append(paragraph)
        elif kind == "chapter":
            parts[section[1]]["chapters"][section[2]]["paragraphs"].append(paragraph)

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("# ") and not line.startswith("## "):
            if line.startswith("# Part "):
                match = re.match(r"# Part ([IVX]+)\. (.+)$", line)
                if not match:
                    raise SystemExit(f"Unparsed part heading: {line}")
                parts.append(
                    {
                        "numeral": match.group(1),
                        "title": match.group(2),
                        "chapters": [],
                    }
                )
                section = ("part", len(parts) - 1)
            continue
        if line.startswith("## "):
            if line == "## Preamble":
                section = ("preamble",)
                continue
            match = re.match(r"## Chapter (\d+)\. (.+)$", line)
            if not match:
                raise SystemExit(f"Unparsed chapter heading: {line}")
            if not parts:
                raise SystemExit(f"Chapter before any part: {line}")
            chapter = {
                "number": int(match.group(1)),
                "title": match.group(2),
                "paragraphs": [],
            }
            parts[-1]["chapters"].append(chapter)
            section = ("chapter", len(parts) - 1, len(parts[-1]["chapters"]) - 1)
            continue
        add_paragraph(line)

    chapters = [chapter for part in parts for chapter in part["chapters"]]
    if len(parts) != 4:
        raise SystemExit(f"Expected 4 parts, found {len(parts)}")
    if [chapter["number"] for chapter in chapters] != list(range(1, 45)):
        raise SystemExit("Chapters are not numbered 1 through 44")
    if not preamble:
        raise SystemExit("Preamble is empty")
    if not subtitle:
        raise SystemExit("Subtitle is missing")
    return {"subtitle": subtitle, "preamble": preamble, "parts": parts, "chapters": chapters}


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def paragraphs_html(paragraphs: list[str]) -> str:
    return "\n".join(f"      <p>{esc(paragraph)}</p>" for paragraph in paragraphs)


def find_paragraph(chapters: list[dict], marker: str) -> tuple[dict, str]:
    matches = []
    for chapter in chapters:
        for paragraph in chapter["paragraphs"]:
            if marker in paragraph:
                matches.append((chapter, paragraph))
    if len(matches) != 1:
        raise SystemExit(f"Marker {marker!r} matched {len(matches)} paragraphs")
    return matches[0]


def chapter_href(number: int, depth: int) -> str:
    name = f"chapter-{number:02d}.html"
    if depth == 0:
        return f"theology/{name}"
    return name


def site_href(path: str, depth: int) -> str:
    return "../" * depth + path


def nav_html(depth: int, current: str) -> str:
    items = []
    for path, label, key in NAV:
        href = site_href(path, depth)
        current_attr = ' aria-current="page"' if key == current else ""
        items.append(f'        <li><a href="{href}"{current_attr}>{label}</a></li>')
    return "\n".join(items)


def footer_html(depth: int) -> str:
    source = site_href("FOUNDING-THEOLOGY.md", depth)
    return f"""  <footer>
    <p>The Faith of the Whole Maker is an offered faith. It is not a registered church. These pages claim no incorporation, charitable certification, tax exemption, or 501(c)(3) status. This is not a state church and not a department of The Formation Party.</p>
    <p><a href="{source}">Founding theology, Markdown source</a></p>
  </footer>"""


def page(title: str, depth: int, current: str, body: str) -> str:
    css = site_href("styles.css", depth)
    js = site_href("site.js", depth)
    home = site_href("index.html", depth)
    description = "The Faith of the Whole Maker. God is the Whole Maker, not the largest possessor. We seek communion rather than possession."
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="stylesheet" href="{css}">
</head>
<body>
  <a href="#main">Skip to content</a>
  <header>
    <p><a href="{home}">The Faith of the Whole Maker</a></p>
    <nav aria-label="Primary">
      <ul>
{nav_html(depth, current)}
      </ul>
    </nav>
  </header>
  <main id="main">
{body}
  </main>
{footer_html(depth)}
  <script src="{js}" defer></script>
</body>
</html>
"""


def chapter_block(chapter: dict, depth: int, heading: str) -> str:
    number = chapter["number"]
    title = f"Chapter {number}. {chapter['title']}"
    link = chapter_href(number, depth)
    return f"""    <section id="chapter-{number}">
      <h{heading}>{esc(title)}</h{heading}>
{paragraphs_html(chapter['paragraphs'])}
      <p><a href="{link}">Chapter {number} page</a></p>
    </section>"""


def held_html(chapters: list[dict], depth: int) -> str:
    blocks = []
    for marker in HELD_MARKERS:
        chapter, paragraph = find_paragraph(chapters, marker)
        link = chapter_href(chapter["number"], depth)
        blocks.append(
            f"""    <figure>
      <blockquote>{esc(paragraph)}</blockquote>
      <figcaption><a href="{link}">Chapter {chapter['number']}. {esc(chapter['title'])}</a></figcaption>
    </figure>"""
        )
    inner = "\n".join(blocks)
    return f"""    <section id="held-as-written">
      <h2>Held as written</h2>
      <p>The passages below are taken whole from the founding theology. This site does not resolve them, finish what they leave unfinished, or promote a labeled source into demonstrated history.</p>
{inner}
    </section>"""


def write(path: Path, contents: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")
    print(path.relative_to(ROOT))


def build() -> None:
    theology = parse_theology(SOURCE.read_text(encoding="utf-8"))
    chapters = theology["chapters"]
    by_number = {chapter["number"]: chapter for chapter in chapters}
    part_of = {}
    for part in theology["parts"]:
        for chapter in part["chapters"]:
            part_of[chapter["number"]] = part

    home_body = f"""    <h1>The Faith of the Whole Maker</h1>
    <p>God is the Whole Maker, not the largest possessor. We seek communion rather than possession.</p>
    <section id="preamble">
      <h2>Preamble</h2>
{paragraphs_html(theology['preamble'])}
      <p><a href="{site_href('theology/preamble.html', 0)}">Preamble page</a></p>
    </section>
    <section id="ways-in">
      <h2>Ways in</h2>
      <ul>
        <li><a href="confession.html">Confession</a></li>
        <li><a href="theology/index.html">Founding theology, four parts and forty-four chapters</a></li>
        <li><a href="practice.html">Practice</a></li>
        <li><a href="belonging.html">Belonging</a></li>
        <li><a href="receiving.html">Receiving other faiths</a></li>
        <li><a href="public-life.html">Public life</a></li>
      </ul>
    </section>
{held_html(chapters, 0)}"""
    write(
        ROOT / "index.html",
        page("The Faith of the Whole Maker", 0, "home", home_body),
    )

    confession_body = f"""    <h1>Confession</h1>
    <p>The preamble and Chapter 1 follow in full. This is the confession of the faith and the account of what this founding is.</p>
    <section id="preamble">
      <h2>Preamble</h2>
{paragraphs_html(theology['preamble'])}
    </section>
    <section id="chapter-1">
      <h2>Chapter 1. {esc(by_number[1]['title'])}</h2>
{paragraphs_html(by_number[1]['paragraphs'])}
      <p><a href="theology/chapter-01.html">Chapter 1 page</a></p>
    </section>
{held_html(chapters, 0)}"""
    write(
        ROOT / "confession.html",
        page("Confession — The Faith of the Whole Maker", 0, "confession", confession_body),
    )

    practice_numbers = [24, 25, 26, 27]
    practice_sections = "\n".join(
        chapter_block(by_number[number], 0, "2") for number in practice_numbers
    )
    practice_links = "\n".join(
        f'        <li><a href="#chapter-{number}">Chapter {number}. {esc(by_number[number]["title"])}</a></li>'
        for number in practice_numbers
    )
    practice_body = f"""    <h1>Practice</h1>
    <p>Prayer, an ordinary rule of life, the gathered community, and the four received traditions follow in full. The traditions are given here as Chapter 27 gives them.</p>
    <nav aria-label="On this page">
      <ul>
{practice_links}
      </ul>
    </nav>
{practice_sections}"""
    write(
        ROOT / "practice.html",
        page("Practice — The Faith of the Whole Maker", 0, "practice", practice_body),
    )

    belonging_body = f"""    <h1>Belonging</h1>
    <p>Membership, as Chapter 28 gives it, follows in full. It is freely undertaken, and a member may pause or leave.</p>
{chapter_block(by_number[28], 0, "2")}"""
    write(
        ROOT / "belonging.html",
        page("Belonging — The Faith of the Whole Maker", 0, "belonging", belonging_body),
    )

    receiving_body = f"""    <h1>Receiving other faiths</h1>
    <p>Chapter 38 and Chapter 9 follow in full, one after another. They are not combined here into a single account.</p>
{chapter_block(by_number[38], 0, "2")}
{chapter_block(by_number[9], 0, "2")}"""
    write(
        ROOT / "receiving.html",
        page("Receiving other faiths — The Faith of the Whole Maker", 0, "receiving", receiving_body),
    )

    public_body = f"""    <h1>Public life</h1>
    <p>Chapter 42 and Chapter 43 follow in full. The Faith of the Whole Maker is not a state church and not a department of The Formation Party. These pages claim no incorporation, charitable certification, tax exemption, or 501(c)(3) status.</p>
    <p>The Formation Party is a separate body, with a separate site at <a href="https://charlesanthonyleone.github.io/the-formation-party/">charlesanthonyleone.github.io/the-formation-party</a>.</p>
{chapter_block(by_number[42], 0, "2")}
{chapter_block(by_number[43], 0, "2")}"""
    write(
        ROOT / "public-life.html",
        page("Public life — The Faith of the Whole Maker", 0, "public", public_body),
    )

    toc_parts = []
    for part in theology["parts"]:
        items = []
        for chapter in part["chapters"]:
            items.append(
                f'        <li><a href="chapter-{chapter["number"]:02d}.html">Chapter {chapter["number"]}. {esc(chapter["title"])}</a></li>'
            )
        toc_parts.append(
            f"""    <section id="part-{part['numeral'].lower()}">
      <h2>Part {esc(part['numeral'])}. {esc(part['title'])}</h2>
      <ol>
{chr(10).join(items)}
      </ol>
    </section>"""
        )
    theology_index_body = f"""    <h1>Founding theology</h1>
    <p>{esc(theology['subtitle'])}</p>
    <p>Four parts and forty-four chapters. This page is the table of contents. Each link opens the chapter in full. The chapters are not summarized here.</p>
    <p><a href="preamble.html">Preamble</a></p>
{held_html(chapters, 1)}
{chr(10).join(toc_parts)}"""
    write(
        ROOT / "theology" / "index.html",
        page("Founding theology — The Faith of the Whole Maker", 1, "theology", theology_index_body),
    )

    preamble_body = f"""    <h1>Preamble</h1>
    <p><a href="index.html">Founding theology</a></p>
{paragraphs_html(theology['preamble'])}
    <p><a href="chapter-01.html">Chapter 1. {esc(by_number[1]['title'])}</a></p>"""
    write(
        ROOT / "theology" / "preamble.html",
        page("Preamble — The Faith of the Whole Maker", 1, "theology", preamble_body),
    )

    ordered = chapters
    for index, chapter in enumerate(ordered):
        part = part_of[chapter["number"]]
        previous_link = ""
        if index > 0:
            previous = ordered[index - 1]
            previous_link = f'<a href="chapter-{previous["number"]:02d}.html">Previous: Chapter {previous["number"]}. {esc(previous["title"])}</a>'
        else:
            previous_link = '<a href="preamble.html">Previous: Preamble</a>'
        following = ""
        if index < len(ordered) - 1:
            nxt = ordered[index + 1]
            following = f'\n      <p><a href="chapter-{nxt["number"]:02d}.html">Next: Chapter {nxt["number"]}. {esc(nxt["title"])}</a></p>'
        body = f"""    <p><a href="index.html">Founding theology</a></p>
    <p>Part {esc(part['numeral'])}. {esc(part['title'])}</p>
    <article>
      <h1>Chapter {chapter['number']}. {esc(chapter['title'])}</h1>
{paragraphs_html(chapter['paragraphs'])}
    </article>
    <nav aria-label="Chapters">
      <p>{previous_link}</p>{following}
      <p><a href="index.html">All chapters</a></p>
    </nav>"""
        write(
            ROOT / "theology" / f"chapter-{chapter['number']:02d}.html",
            page(
                f"Chapter {chapter['number']}. {chapter['title']} — The Faith of the Whole Maker",
                1,
                "theology",
                body,
            ),
        )

    write(ROOT / ".nojekyll", "")
    verify(theology)


def text_without_tags(document: str) -> str:
    without = re.sub(r"<[^>]+>", " ", document)
    return html.unescape(without)


def verify(theology: dict) -> None:
    forbidden = [
        "the woman and God",
        "Progressive Conservative",
        "inteloasis.com",
        "fonts.googleapis.com",
        "fonts.gstatic.com",
        "#C41E3A",
        "#0A2342",
    ]
    required = [
        "The Faith of the Whole Maker",
        "God is the Whole Maker, not the largest possessor. We seek communion rather than possession.",
        "explicitly tagged fiction and in-progress",
        "not sacraments",
        "recognize elders as lamps",
        "no magisterium",
        "open collection of originating witnesses",
        "reproductive theology is unfinished",
        "not as a political document, not as a new religion",
        "not the spiritual department of The Formation Party",
        "claim no official church registration",
        "not a state church",
    ]
    html_files = list(ROOT.glob("*.html")) + list((ROOT / "theology").glob("*.html"))
    blob = "\n".join(path.read_text(encoding="utf-8") for path in html_files)
    plain = text_without_tags(blob)
    for phrase in forbidden:
        if phrase in plain or phrase in blob:
            raise SystemExit(f"Forbidden phrase present: {phrase}")
    for phrase in required:
        if phrase not in plain:
            raise SystemExit(f"Required phrase missing: {phrase}")
    for chapter in theology["chapters"]:
        document = (ROOT / "theology" / f"chapter-{chapter['number']:02d}.html").read_text(encoding="utf-8")
        visible = text_without_tags(document)
        for paragraph in chapter["paragraphs"]:
            if paragraph not in visible:
                raise SystemExit(f"Chapter {chapter['number']} is missing a paragraph")
        if f"Chapter {chapter['number']}. {chapter['title']}" not in visible:
            raise SystemExit(f"Chapter {chapter['number']} title missing")
    preamble_doc = text_without_tags((ROOT / "theology" / "preamble.html").read_text(encoding="utf-8"))
    for paragraph in theology["preamble"]:
        if paragraph not in preamble_doc:
            raise SystemExit("Preamble page is missing a paragraph")
    if not (ROOT / ".nojekyll").is_file():
        raise SystemExit(".nojekyll missing")
    print(f"Verified {len(theology['chapters'])} chapters and the preamble.")


if __name__ == "__main__":
    build()
