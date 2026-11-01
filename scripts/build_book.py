"""Generate static reader data, preserving the manuscript and paragraph boundaries.
Run from any directory: python3 scripts/build_book.py
No runtime dependencies or network requests are needed to read the book.
"""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'content/manuscrito.md').read_text(encoding='utf-8')
blocks = re.split(r'\n\s*---\s*\n', source)
pages = []
chapters = []


def paragraph(raw, identity):
    text, formats, cursor = '', [], 0
    for match in re.finditer(r'(\*\*|\*)(.+?)\1', raw):
        text += raw[cursor:match.start()]
        start = len(text)
        text += match.group(2)
        formats.append({'start': start, 'end': len(text),
                       'tag': 'strong' if match.group(1) == '**' else 'em'})
        cursor = match.end()
    text += raw[cursor:]
    return {'id': identity, 'text': text, 'formats': formats}


front = blocks[0].strip().split('\n\n')
title = front[0].removeprefix('# ').strip()
subtitle = front[1].strip('*')
author = front[2].strip('*')
pages.append({'id': 'portadilla', 'chapterId': 'portadilla', 'label': 'Portadilla', 'title': title.capitalize(
), 'isTitle': True, 'firstInChapter': True, 'paragraphs': [paragraph(front[1], 'subtitle'), paragraph(front[2], 'author')]})

for chapter_number, block in enumerate(blocks[1:]):
    lines = block.strip().splitlines()
    headings = [line.lstrip('#').strip()
                for line in lines if line.startswith('#')]
    if not headings:
        continue
    label = headings[0]
    chapter_title = headings[-1]
    chapter_id = 'dedicatoria' if chapter_number == 0 else 'prologo' if chapter_number == 1 else f'capitulo-{chapter_number-1}'
    body = '\n'.join(
        line for line in lines if not line.startswith('#')).strip()
    paragraphs = [paragraph(raw.strip(), f'{chapter_id}-p{i+1}')
                  for i, raw in enumerate(re.split(r'\n\s*\n', body)) if raw.strip()]
    chapter_pages, group, cost = [], [], 0
    for para in paragraphs:
        # Paragraph spacing also consumes room; short poetic lines need space.
        weight = len(para['text'].split()) + 8
        budget = 160 if not chapter_pages else 205
        if group and cost + weight > budget:
            chapter_pages.append(group)
            group, cost = [], 0
        group.append(para)
        cost += weight
    if group:
        chapter_pages.append(group)
    # Avoid a nearly empty final leaf when the preceding one can accommodate it.
    if len(chapter_pages) > 1:
        last_cost = sum(len(p['text'].split()) + 8 for p in chapter_pages[-1])
        prior_cost = sum(len(p['text'].split()) + 8 for p in chapter_pages[-2])
        if last_cost < 35 and prior_cost + last_cost < 230:
            chapter_pages[-2].extend(chapter_pages.pop())
    start_page = len(pages) + 1
    for index, group in enumerate(chapter_pages):
        pages.append({'id': f'{chapter_id}-{index+1}', 'chapterId': chapter_id, 'label': label, 'title': chapter_title,
                     'firstInChapter': index == 0, 'part': index+1, 'parts': len(chapter_pages), 'paragraphs': group})
    # Verify every character and original paragraph survived pagination.
    assert [p for group in chapter_pages for p in group] == paragraphs
    chapters.append({'id': chapter_id, 'title': chapter_title, 'label': label,
                    'startPage': start_page, 'pageCount': len(chapter_pages)})

assert len(chapters) == 12, 'Expected dedicatoria, prólogo and ten chapters'
assert all(c['pageCount'] >
           1 for c in chapters if c['id'].startswith('capitulo-'))
book = {'id': 'todo-lo-que-nunca-supe-decirte', 'title': title.capitalize(), 'subtitle': subtitle, 'author': author,
        'manuscriptAvailable': True, 'sourceSha256': hashlib.sha256(source.encode()).hexdigest(), 'chapters': chapters, 'pages': pages}
(ROOT / 'book.js').write_text('// Generated from content/manuscrito.md by scripts/build_book.py.\nwindow.RELATIONSHIP_BOOK = ' +
                              json.dumps(book, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(
    f'{len(pages)} manuscript pages + 1 continuation page; {len(chapters)} sections; {sum(len(p["text"].split()) for page in pages for p in page["paragraphs"])} words')
for chapter in chapters:
    print(
        f'{chapter["label"]}: {chapter["pageCount"]} pages (starts at {chapter["startPage"]})')
