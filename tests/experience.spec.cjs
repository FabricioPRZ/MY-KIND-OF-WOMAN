const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bookContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../book.js'), 'utf8'), bookContext);
const book = bookContext.window.RELATIONSHIP_BOOK;
const storageKey = `mkow-reader-v2:${book.id}`;
async function readState(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey); }
async function open(page) { await page.goto('/'); await page.locator('#open-reader').click(); }
async function selectText(page, selector, start, end, endSelector = selector) {
  return page.evaluate(({ selector, start, end, endSelector }) => {
    const first = document.querySelector(selector), last = document.querySelector(endSelector);
    function endpoint(element, offset) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) { if (offset <= node.textContent.length) return [node, offset]; offset -= node.textContent.length; }
      throw Error('Selection offset is outside the paragraph');
    }
    const range = document.createRange(); range.setStart(...endpoint(first, start)); range.setEnd(...endpoint(last, end));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    return range.toString();
  }, { selector, start, end, endSelector });
}
test('manuscript is complete and every chapter spans multiple pages', async () => {
  expect(book.chapters).toHaveLength(12);
  expect(book.pages).toHaveLength(68);
  const source = fs.readFileSync(path.join(__dirname, '../content/manuscrito.md'), 'utf8');
  const sourceParagraphs = source.split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !p.startsWith('#') && p !== '---').map(p => p.replace(/\*\*/g, '').replace(/\*/g, ''));
  const actual = book.pages.flatMap(p => p.paragraphs.map(p => p.text));
  expect(actual).toEqual(sourceParagraphs);
  for (const chapter of book.chapters.filter(c => c.id.startsWith('capitulo-'))) expect(chapter.pageCount).toBeGreaterThan(1);
  expect(new Set(book.pages.map(p => p.id)).size).toBe(book.pages.length);
});
test('all sixteen images, eight new photos, filters and keyboard lightbox work', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.photo-card')).toHaveCount(16);
  await page.locator('[data-filter=new]').click();
  await expect(page.locator('.photo-card')).toHaveCount(8);
  await page.locator('.photo-button').first().click();
  await expect(page.locator('#lightbox')).toBeVisible();
  const first = await page.locator('#lightbox-image').getAttribute('src');
  await page.keyboard.press('ArrowRight');
  expect(await page.locator('#lightbox-image').getAttribute('src')).not.toBe(first);
  await page.keyboard.press('Escape');
  await expect(page.locator('#lightbox')).not.toBeVisible();
  await expect(page.locator('.photo-button').first()).toBeFocused();
  await page.locator('[data-filter=her]').click(); await expect(page.locator('.photo-card')).toHaveCount(3);
  await page.locator('[data-filter=all]').click();
  for (const image of await page.locator('.photo-button img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  expect(errors).toEqual([]);
});
const leaves = page => page.locator('#book-page > .paper-leaf[data-page-index]');
async function indexOpen(page) { if (!await page.locator('#reader-index').evaluate(el => el.open)) await page.locator('#reader-index > summary').click(); }
async function chapter(page, id) { await indexOpen(page); await page.locator(`#chapter-list [data-chapter="${id}"]`).click(); }
async function noteOpen(page) { if (!await page.locator('#note-panel').evaluate(el => el.open)) await page.locator('#note-panel > summary').click(); }

test('reader is inline, ribbons and notes persist and can be backed up', async ({ page }) => {
  await open(page);
  await expect(page.locator('#reader')).toHaveJSProperty('tagName', 'SECTION');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(leaves(page)).toHaveCount(2);
  await expect(page.locator('body')).not.toHaveClass(/modal-open/);
  await page.locator('#note-page-select').selectOption({ value: '1' });
  await page.locator('#bookmark-color').selectOption('blue'); await page.locator('#bookmark-page').click();
  await expect(leaves(page).nth(1).locator('.paper-ribbon')).toHaveAttribute('data-ribbon-color', 'blue');
  await noteOpen(page); await page.locator('#page-note').fill('Quiero volver a estas palabras.');
  await page.locator('#reader-theme').selectOption('night');
  await chapter(page, 'capitulo-5');
  const position = (await readState(page)).position;
  await page.reload(); await expect(page.locator('#pagination-status')).toBeHidden();
  await expect(page.locator('#reader')).toHaveAttribute('data-theme', 'night');
  expect((await readState(page)).position).toEqual(position);
  const state = await readState(page);
  expect(state.bookmarks[0].color).toBe('blue');
  expect(state.notes[0].text).toBe('Quiero volver a estas palabras.');
  await indexOpen(page); await page.locator('#bookmark-list .saved-jump').click();
  await noteOpen(page); await expect(page.locator('#page-note')).toHaveValue('Quiero volver a estas palabras.');
  await page.locator('#bookmark-color').selectOption('lilac');
  expect((await readState(page)).bookmarks[0].color).toBe('lilac');
  await indexOpen(page);
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-notes').click();
  const download = await downloadPromise; const data = fs.readFileSync(await download.path(), 'utf8');
  expect(JSON.parse(data).notes[0].text).toBe('Quiero volver a estas palabras.');
  await page.locator('#page-note').fill('Mi nota nueva.');
  await page.locator('#import-notes').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(data) });
  await expect(page.locator('#toast')).toContainText('sin borrar');
  expect((await readState(page)).notes[0].text).toContain('Mi nota nueva.');
  expect((await readState(page)).notes[0].text).toContain('Quiero volver');
  await page.locator('#import-notes').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.locator('#toast')).toContainText('No pudimos leer');
});

test('highlight offsets and colored bookmarks survive responsive repagination', async ({ page }) => {
  await open(page); await chapter(page, 'capitulo-1');
  const selector = '[data-paragraph-id="capitulo-1-p1"]';
  const quote = await selectText(page, selector, 4, 35);
  await page.locator('[data-highlight-color=pink]').click();
  expect((await readState(page)).highlights[0].quote).toBe(quote);
  await page.locator('#bookmark-color').selectOption('green'); await page.locator('#bookmark-page').click();
  const before = await readState(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(leaves(page)).toHaveCount(1);
  await expect.poll(async () => await leaves(page).first().evaluate(el => el.getBoundingClientRect().height)).toBe(550);
  await page.locator('#font-larger').click(); await page.locator('#font-larger').click();
  const after = await readState(page);
  expect(after.highlights).toEqual(before.highlights); expect(after.bookmarks).toEqual(before.bookmarks);
  await indexOpen(page); await page.locator('#highlight-list .saved-jump').click();
  await expect(page.locator('#book-page > .paper-leaf mark')).toHaveCount(1);
  await page.reload(); await expect(page.locator('#pagination-status')).toBeHidden();
  await expect(page.locator('#book-page > .paper-leaf mark')).toHaveCount(1);
  await indexOpen(page); await page.locator('#highlight-list .remove-saved').click();
  expect((await readState(page)).highlights).toHaveLength(0);
});

test('selection across both leaves preserves the original paragraph text', async ({ page }) => {
  await open(page); await chapter(page, 'capitulo-1');
  const left = '#book-page > .paper-leaf:nth-child(1) .paper-text p:last-of-type';
  const right = '#book-page > .paper-leaf:nth-child(2) .paper-text p:first-of-type';
  await selectText(page, left, 0, 20, right);
  await page.locator('[data-highlight-color=yellow]').click();
  const marks = (await readState(page)).highlights;
  expect(marks.length).toBeGreaterThanOrEqual(2);
  for (const mark of marks) {
    const source = book.pages.flatMap(p => p.paragraphs).find(p => p.id === mark.paragraphId);
    expect(mark.quote).toBe(source.text.slice(mark.start, mark.end));
  }
});

test('every mobile leaf fits a fixed book, and pagination preserves all manuscript characters', async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 320, height: 740 });
  await open(page);
  const expectedHeight = await leaves(page).first().evaluate(el => el.getBoundingClientRect().height);
  const chunks = []; let visited = 0;
  while (true) {
    const result = await leaves(page).evaluateAll(elements => elements.map(leaf => ({
      height: leaf.getBoundingClientRect().height,
      overflow: leaf.querySelector('.paper-text').scrollHeight > leaf.querySelector('.paper-text').clientHeight,
      chunks: [...leaf.querySelectorAll('[data-paragraph-id]')].map(p => ({ id: p.dataset.paragraphId, start: Number(p.dataset.start), text: p.textContent }))
    })));
    for (const leaf of result) { expect(leaf.height).toBe(expectedHeight); expect(leaf.overflow, `overflow on leaf ${visited + 1}`).toBe(false); chunks.push(...leaf.chunks); visited++; }
    if (await page.locator('#next-page').isDisabled()) break;
    await page.locator('#next-page').click();
  }
  expect(visited).toBeGreaterThan(68);
  const actual = new Map(); for (const chunk of chunks) actual.set(chunk.id, (actual.get(chunk.id) || '') + chunk.text);
  for (const paragraph of book.pages.flatMap(p => p.paragraphs)) expect(actual.get(paragraph.id), paragraph.id).toBe(paragraph.text);
  expect(actual.get('end-5')).toBe('La próxima página todavía la estoy escribiendo.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('large type, tablet and desktop leaves fit without changing height', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await chapter(page, 'capitulo-4');
    for (let i = 0; i < 7; i++) if (!await page.locator('#font-larger').isDisabled()) await page.locator('#font-larger').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow at ${width}`).toBe(true);
    const height = await leaves(page).first().evaluate(el => el.getBoundingClientRect().height);
    for (let i = 0; i < 5; i++) {
      const dimensions = await leaves(page).evaluateAll(elements => elements.map(el => ({ height: el.getBoundingClientRect().height, overflow: el.querySelector('.paper-text').scrollHeight > el.querySelector('.paper-text').clientHeight, width: el.scrollWidth > el.clientWidth })));
      for (const d of dimensions) { expect(d.height).toBe(height); expect(d.overflow).toBe(false); expect(d.width).toBe(false); }
      await page.locator('#next-page').click();
    }
  }
});

test('page turn animates in place, rapid turns finish correctly and reduced motion skips rotation', async ({ page }) => {
  await open(page);
  const before = await page.locator('#book-page').boundingBox();
  await page.locator('#next-page').click();
  await expect(page.locator('.turning-leaf')).toBeAttached();
  const animation = await page.locator('.turning-leaf').evaluate(el => el.getAnimations()[0]?.effect.getTiming().duration);
  expect(animation).toBe(280);
  await page.locator('#next-page').click();
  await expect(page.locator('#page-number')).toContainText('5–6 /');
  await expect(page.locator('.turning-leaf')).toHaveCount(0);
  const after = await page.locator('#book-page').boundingBox(); expect(after.height).toBe(before.height); expect(after.width).toBe(before.width);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('#next-page').click();
  await expect(page.locator('.turning-leaf')).toHaveCount(0);
  await page.locator('#book-page').focus(); await page.keyboard.press('ArrowRight'); await expect(page.locator('.turning-leaf')).toHaveCount(0);
});

test('old backups migrate without losing highlights, ribbons or notes', async ({ page }) => {
  const first = book.pages.find(p => p.id === 'capitulo-1-1').paragraphs[0];
  await page.addInitScript(({ id, paragraph }) => localStorage.setItem(`mkow-reader-v1:${id}`, JSON.stringify({ version: 1, bookId: id, pageId: 'capitulo-1-1', fontSize: 21, theme: 'rose', bookmarks: [{ pageId: 'capitulo-1-1', color: 'blue' }], highlights: [{ paragraphId: paragraph.id, pageId: 'capitulo-1-1', start: 0, end: 20, color: 'pink', quote: paragraph.text.slice(0, 20) }], notes: { 'capitulo-1-1': 'Mi nota de la versión anterior.' } })), { id: book.id, paragraph: first });
  await open(page); const state = await readState(page);
  expect(state.version).toBe(2); expect(state.bookmarks[0].color).toBe('blue'); expect(state.highlights[0].quote).toBe(first.text.slice(0, 20)); expect(state.notes[0].text).toContain('versión anterior');
});

test('unavailable storage keeps the inline reader usable and warns about saving', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('Blocked', 'SecurityError'); }; });
  await open(page); await page.locator('#bookmark-page').click();
  await indexOpen(page); await expect(page.locator('#storage-status')).toContainText('no permite guardar');
  await noteOpen(page); await page.locator('#page-note').fill('Todavía puedo escribir.');
  await expect(page.locator('#note-status')).toContainText('Descarga una copia');
});
