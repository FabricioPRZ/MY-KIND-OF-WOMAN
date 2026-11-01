const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bookContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../book.js'), 'utf8'), bookContext);
const book = bookContext.window.RELATIONSHIP_BOOK;
const storageKey = `mkow-reader-v1:${book.id}`;
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
test('colored ribbons, right-hand page notes, preferences and progress survive reload', async ({ page }) => {
  await open(page);
  await expect(page.locator('.book-page')).toHaveCount(2);
  await page.locator('#note-page-select').selectOption('dedicatoria-1');
  await page.locator('#bookmark-color').selectOption('blue');
  await page.locator('#bookmark-page').click();
  await expect(page.locator('[data-leaf-id="dedicatoria-1"] .leaf-ribbon')).toHaveAttribute('data-ribbon-color', 'blue');
  await page.locator('#page-note').fill('Quiero volver a estas palabras.');
  await page.locator('#reader-theme').selectOption('night');
  await page.locator('#font-larger').click();
  await page.locator('#chapter-list [data-chapter="capitulo-5"]').click();
  await expect(page.locator('#page-number')).toHaveText('32–33 / 69');
  await page.locator('#close-reader').click();
  await page.reload(); await page.locator('#open-reader').click();
  await expect(page.locator('#page-number')).toHaveText('32–33 / 69');
  await expect(page.locator('#reader')).toHaveAttribute('data-theme', 'night');
  const state = await readState(page);
  expect(state.bookmarks).toContainEqual({ pageId: 'dedicatoria-1', color: 'blue' });
  expect(state.notes['dedicatoria-1']).toBe('Quiero volver a estas palabras.');
  expect(state.fontSize).toBe(22);
  await page.locator('#bookmark-list .saved-jump').click();
  await expect(page.locator('#page-note')).toHaveValue('Quiero volver a estas palabras.');
  await page.locator('#bookmark-color').selectOption('lilac');
  expect((await readState(page)).bookmarks[0].color).toBe('lilac');
});
test('selections spanning paragraphs, overlapping colors and deletion persist safely', async ({ page }) => {
  await open(page);
  await page.locator('#chapter-list [data-chapter="capitulo-1"]').click();
  const first = '[data-paragraph-id="capitulo-1-p1"]', second = '[data-paragraph-id="capitulo-1-p2"]';
  await selectText(page, first, 4, 25, second);
  await page.locator('[data-color=pink]').click();
  expect((await readState(page)).highlights).toHaveLength(2);
  await selectText(page, second, 5, 15);
  await page.locator('[data-color=green]').click();
  const highlights = (await readState(page)).highlights;
  expect(highlights).toHaveLength(4);
  expect(highlights.find(h => h.color === 'green').quote).toHaveLength(10);
  await page.reload(); await page.locator('#open-reader').click();
  await expect(page.locator('mark[data-color=green]')).toHaveCount(1);
  await expect(page.locator('#highlight-list .saved-item')).toHaveCount(4);
  await page.locator('#highlight-list .remove-saved').first().click();
  expect((await readState(page)).highlights).toHaveLength(3);
  await page.locator('#highlight-list .saved-jump').last().click();
  await expect(page.locator('mark[data-color=green]')).toHaveCount(1);
});
test('a highlight can span both open leaves without losing either page', async ({ page }) => {
  await open(page);
  await page.locator('#chapter-list [data-chapter="capitulo-1"]').click();
  const nodes = await page.locator('.book-page').evaluateAll(leaves => leaves.map(leaf => [...leaf.querySelectorAll('[data-paragraph-id]')].map(p => p.dataset.paragraphId)));
  const left = nodes[0].at(-1), right = nodes[1][0];
  await selectText(page, `[data-paragraph-id="${left}"]`, 0, 20, `[data-paragraph-id="${right}"]`);
  await page.locator('[data-color=yellow]').click();
  const marks = (await readState(page)).highlights;
  expect(marks).toHaveLength(2); expect(marks[0].pageId).not.toBe(marks[1].pageId);
  await expect(page.locator('.book-page').first().locator('mark')).toHaveCount(1);
  await expect(page.locator('.book-page').last().locator('mark')).toHaveCount(1);
});
test('backup export/import merges notes and rejects invalid files', async ({ page }) => {
  await open(page);
  await page.locator('#bookmark-color').selectOption('green'); await page.locator('#bookmark-page').click();
  await page.locator('#page-note').fill('Mi primera nota.');
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-notes').click();
  const download = await downloadPromise; const data = fs.readFileSync(await download.path(), 'utf8');
  expect(JSON.parse(data).notes.portadilla).toBe('Mi primera nota.');
  await page.locator('#page-note').fill('Mi nota nueva.'); await page.locator('#bookmark-page').click();
  await page.locator('#import-notes').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(data) });
  await expect(page.locator('#toast')).toContainText('sin borrar');
  expect((await readState(page)).notes.portadilla).toContain('Mi nota nueva.');
  expect((await readState(page)).notes.portadilla).toContain('Mi primera nota.');
  expect((await readState(page)).bookmarks).toHaveLength(1);
  await page.locator('#import-notes').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.locator('#toast')).toContainText('No pudimos leer');
  expect((await readState(page)).bookmarks).toHaveLength(1);
});
test('mobile single leaves, all pages, final continuation and narrow layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  await expect(page.locator('.book-page')).toHaveCount(1);
  await expect(page.locator('#reader-index')).not.toHaveAttribute('open');
  const ids = [];
  for (let index = 0; index < 69; index++) {
    ids.push(await page.locator('.book-page').getAttribute('data-leaf-id'));
    expect(await page.locator('#reader').evaluate(el => el.scrollWidth <= innerWidth)).toBe(true);
    if (index < 68) await page.locator('#next-page').click();
  }
  expect(new Set(ids).size).toBe(69);
  await expect(page.locator('#book-page')).toContainText('La próxima página todavía la estoy escribiendo.');
  await expect(page.locator('#next-page')).toBeDisabled();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.locator('#reader').evaluate(el => el.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#close-reader').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#open-reader').click();
  await expect(page.locator('#page-number')).toHaveText('69 / 69');
});
test('unavailable storage keeps reading usable and warns before data is lost', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('Blocked', 'SecurityError'); }; });
  await open(page); await page.locator('#bookmark-page').click();
  await expect(page.locator('#storage-status')).toContainText('no permite guardar');
  await page.locator('#page-note').fill('Todavía puedo escribir.');
  await expect(page.locator('#note-status')).toContainText('Descarga una copia');
  await page.locator('#next-page').click(); await expect(page.locator('#page-number')).toHaveText('3–4 / 69');
});
