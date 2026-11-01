'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
let toastTimer;
function notify(message) {
  const toast = $('#toast');
  const modal = $('dialog[open]');
  (modal || document.body).append(toast);
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}
function syncScrollLock() {
  document.body.classList.toggle('modal-open', Boolean($('dialog[open]')));
}

// Keep the original files; the album opens each image without cropping.
const photoInfo = {
  1: ['Tus ojos, mi lugar favorito', 'Ella frente al espejo con un vestido azul'],
  2: ['Mi persona favorita', 'Los dos juntos frente al espejo'],
  3: ['Qué bonito coincidir', 'Una selfie de los dos juntos'],
  4: ['Un beso para guardar', 'Un beso en la mejilla, capturado en una fotografía'],
  5: ['Aquí quiero quedarme', 'Un beso compartido mientras ella sonríe'],
  6: ['Contigo, así de cerca', 'Los dos apoyando sus rostros uno junto al otro'],
  7: ['La niña que fuiste', 'Una fotografía de ella cuando era pequeña'],
  8: ['Tan bonita siendo tú', 'Ella frente a un espejo con un vestido rosa'],
  9: ['Mi sonrisa contigo', 'Los dos sonriendo para una selfie'],
  10: ['Siempre mi favorita', 'Los dos juntos frente a una pared con una mariposa'],
  11: ['Una noche contigo', 'Los dos juntos bajo las luces de una salida nocturna'],
  12: ['Un pedacito de nosotros', 'Un collage de fotografías de la pareja'],
  13: ['Tú haces bonito el lugar', 'Una selfie juntos bajo luces de colores'],
  14: ['De esos besos que se quedan', 'Ella le da un beso en la mejilla'],
  15: ['El mundo puede esperar', 'Los dos compartiendo un beso'],
  16: ['También en nuestras locuras', 'Los dos con mascarillas faciales, haciendo un gesto divertido']
};
const photos = [10, 14, 11, 16, 9, 15, 13, 12, 3, 5, 6, 4, 1, 2, 8, 7].map(id => ({
  id, src: `public/foto${id}.jpeg`, caption: photoInfo[id][0], alt: photoInfo[id][1],
  isNew: id >= 9, group: [1, 7, 8].includes(id) ? 'her' : 'together'
}));
let filteredPhotos = photos;
let photoIndex = 0;
const lightbox = $('#lightbox');
function renderAlbum(filter = 'all') {
  filteredPhotos = photos.filter(photo => filter === 'all' || (filter === 'new' ? photo.isNew : photo.group === filter));
  $('#photo-grid').replaceChildren(...filteredPhotos.map((photo, index) => {
    const figure = make('figure', 'photo-card');
    const button = make('button', 'photo-button');
    button.setAttribute('aria-label', `Ampliar: ${photo.alt}`);
    const img = make('img');
    img.src = photo.src; img.alt = photo.alt; img.loading = 'lazy'; img.decoding = 'async';
    img.width = 900; img.height = 1200;
    const caption = make('span', 'photo-caption');
    caption.append(make('small', '', String(photo.id).padStart(2, '0')), make('span', '', photo.caption));
    button.append(img, caption);
    if (photo.isNew) button.append(make('span', 'new-label', 'Nuevo recuerdo'));
    button.addEventListener('click', () => {
      photoIndex = index; renderLightbox(); lightbox.showModal(); syncScrollLock();
    });
    figure.append(button); return figure;
  }));
  $('#photo-count').textContent = `${filteredPhotos.length} recuerdos para volver a vivir`;
}
function renderLightbox() {
  const photo = filteredPhotos[photoIndex];
  $('#lightbox-image').src = photo.src;
  $('#lightbox-image').alt = photo.alt;
  $('#lightbox-caption').textContent = `${photo.caption} · ${photoIndex + 1} / ${filteredPhotos.length}`;
}
function movePhoto(direction) {
  photoIndex = (photoIndex + direction + filteredPhotos.length) % filteredPhotos.length;
  renderLightbox();
}
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  $$('[data-filter]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  renderAlbum(button.dataset.filter);
}));
$('#previous-photo').addEventListener('click', () => movePhoto(-1));
$('#next-photo').addEventListener('click', () => movePhoto(1));
$('#close-lightbox').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
lightbox.addEventListener('close', syncScrollLock);
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); movePhoto(event.key === 'ArrowLeft' ? -1 : 1); }
});
renderAlbum();
$('#load-song').addEventListener('click', () => {
  const iframe = make('iframe');
  iframe.src = 'https://open.spotify.com/embed/track/6jgkEbmQ2F2onEqsEhiliL';
  iframe.title = 'My Kind of Woman de Mac DeMarco en Spotify'; iframe.height = '152';
  iframe.allow = 'encrypted-media; fullscreen; picture-in-picture';
  $('#spotify-player').replaceChildren(iframe); $('#load-song').hidden = true;
});

// Annotations use stable page/paragraph IDs and text offsets, never HTML.
const book = window.RELATIONSHIP_BOOK;
const continuation = {
  id: 'continuara', label: 'Una pausa, no un final', title: 'Continuará, contigo.',
  paragraphs: [
    { id: 'end-1', text: 'Si llegaste hasta aquí, ya conoces un poco más de todo lo que nunca supe decirte.' },
    { id: 'end-2', text: 'Este libro todavía no está terminado. Sigo escribiéndolo, despacio, entre los recuerdos que vuelven y los días que seguimos compartiendo.' },
    { id: 'end-3', text: 'Aún me quedan cosas por contarte, palabras por encontrar y muchas páginas que quiero dedicarte. Guarda aquí tu separador; cuando vuelvas, espero tener un poquito más de nosotros para ti.' },
    { id: 'end-4', text: 'Gracias por leerme. Por estar en estas páginas y, sobre todo, en mi vida.' },
    { id: 'end-5', text: 'La próxima página todavía la estoy escribiendo.' },
    { id: 'end-6', text: 'Con todo mi amor,\nFabricio.' }
  ]
};
const fallback = { id: 'carta', label: 'Mientras escribo nuestra historia', title: 'Una carta para ti', paragraphs: $$('#letter-content p').map((p, index) => ({ id: `letter-${index}`, text: p.textContent })) };
const pages = [...(book.manuscriptAvailable && book.pages.length ? book.pages : [fallback]), continuation];
const pageById = new Map(pages.map(page => [page.id, page]));
const storageKey = `mkow-reader-v1:${book.id}`;
const reader = $('#reader');
const pageElement = $('#book-page');
const scrollArea = $('#reader-scroll');
const colors = ['yellow', 'pink', 'green'];
const bookmarkColors = ['pink', 'yellow', 'green', 'blue', 'lilac'];
const themes = ['paper', 'rose', 'night'];
const spreadMedia = matchMedia('(min-width:1200px)');
let storageAvailable = true;
const defaultState = () => ({ version: 1, bookId: book.id, pageId: pages[0].id, scroll: 0, fontSize: 21, theme: 'paper', bookmarks: [], highlights: [], notes: {} });
function validateState(input) {
  if (!input || typeof input !== 'object' || input.version !== 1 || input.bookId !== book.id) throw new Error('Esta copia no pertenece a este libro.');
  const result = defaultState();
  result.pageId = pageById.has(input.pageId) ? input.pageId : pages[0].id;
  result.scroll = Number.isFinite(input.scroll) ? Math.max(0, input.scroll) : 0;
  result.fontSize = Number.isFinite(input.fontSize) ? Math.max(18, Math.min(32, input.fontSize)) : 23;
  result.theme = themes.includes(input.theme) ? input.theme : 'paper';
  if (Array.isArray(input.bookmarks)) {
    for (const mark of input.bookmarks) {
      const id = typeof mark === 'string' ? mark : mark?.pageId;
      if (pageById.has(id) && !result.bookmarks.some(b => b.pageId === id)) result.bookmarks.push({ pageId: id, color: bookmarkColors.includes(mark?.color) ? mark.color : 'pink' });
    }
  }
  if (input.notes && typeof input.notes === 'object') {
    for (const page of pages) if (typeof input.notes[page.id] === 'string') result.notes[page.id] = input.notes[page.id].slice(0, 10000);
  }
  if (Array.isArray(input.highlights)) {
    for (const item of input.highlights.slice(0, 10000)) {
      if (!item || typeof item !== 'object') continue;
      const para = pageById.get(item.pageId)?.paragraphs.find(p => p.id === item.paragraphId);
      if (!para || !Number.isInteger(item.start) || !Number.isInteger(item.end) || item.start < 0 || item.end <= item.start || item.end > para.text.length || !colors.includes(item.color) || item.quote !== para.text.slice(item.start, item.end)) continue;
      if (result.highlights.some(h => h.pageId === item.pageId && h.paragraphId === item.paragraphId && h.start < item.end && h.end > item.start)) continue;
      result.highlights.push({ id: `${item.pageId}:${item.paragraphId}:${item.start}:${item.end}`, pageId: item.pageId, paragraphId: item.paragraphId, start: item.start, end: item.end, color: item.color, quote: item.quote });
    }
  }
  return result;
}
let state = defaultState();
try { const saved = localStorage.getItem(storageKey); if (saved) state = validateState(JSON.parse(saved)); }
catch { storageAvailable = false; }
let currentIndex = pages.findIndex(page => page.id === state.pageId);
let activePageId = pages[currentIndex].id;
const visiblePages = () => pages.slice(currentIndex, currentIndex + (spreadMedia.matches ? 2 : 1));
let pendingSelection = [];
let scrollTimer;
function saveState() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); storageAvailable = true; }
  catch { storageAvailable = false; }
  $('#storage-status').textContent = storageAvailable
    ? 'Tus marcas y notas se guardan en este navegador. Descarga una copia para conservarlas o llevarlas a otro dispositivo.'
    : 'Este navegador no permite guardar tus cambios. Descarga una copia antes de cerrar para no perder tus marcas y notas.';
  return storageAvailable;
}
function applyPreferences() {
  reader.dataset.theme = state.theme;
  reader.style.setProperty('--reader-size', `${state.fontSize}px`);
  $('#reader-theme').value = state.theme;
  $('#font-smaller').disabled = state.fontSize <= 18;
  $('#font-larger').disabled = state.fontSize >= 32;
}
function updateResume() {
  $('#resume-label').textContent = `Tu lugar: página ${currentIndex + 1} de ${pages.length}. Puedes volver cuando quieras.`;
}
function paragraphNode(paragraph, pageId) {
  const p = make('p'); p.dataset.paragraphId = paragraph.id; p.dataset.pageId = pageId;
  const highlights = state.highlights.filter(h => h.pageId === pageId && h.paragraphId === paragraph.id).sort((a, b) => a.start - b.start);
  const formats = paragraph.formats || [];
  const boundaries = [...new Set([0, paragraph.text.length, ...highlights.flatMap(h => [h.start, h.end]), ...formats.flatMap(f => [f.start, f.end])])].sort((a, b) => a - b);
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i], end = boundaries[i + 1];
    let node = document.createTextNode(paragraph.text.slice(start, end));
    const format = formats.find(f => f.start <= start && f.end >= end);
    if (format) { const wrapper = make(format.tag === 'strong' ? 'strong' : 'em'); wrapper.append(node); node = wrapper; }
    const highlight = highlights.find(h => h.start <= start && h.end >= end);
    if (highlight) { const mark = make('mark'); mark.dataset.color = highlight.color; mark.dataset.highlightId = highlight.id; mark.append(node); node = mark; }
    p.append(node);
  }
  return p;
}
function clearSelection() {
  pendingSelection = [];
  $$('[data-color]').forEach(button => { button.disabled = true; });
  $('#selection-help').textContent = 'Selecciona una frase y elige un color para resaltarla.';
}
function renderPage({ restoreScroll = 0, focus = false } = {}) {
  clearTimeout(scrollTimer);
  clearSelection();
  const page = pages[currentIndex];
  state.pageId = page.id;
  const shown = visiblePages();
  if (!shown.some(p => p.id === activePageId)) activePageId = page.id;
  pageElement.classList.toggle('two-pages', shown.length === 2);
  pageElement.replaceChildren(...shown.map((leaf, index) => {
    const article = make('article', 'book-page'); article.dataset.leafId = leaf.id;
    article.setAttribute('aria-label', `Página ${currentIndex + index + 1}: ${leaf.title}`);
    if (leaf.isTitle) article.classList.add('title-page');
    if (leaf.id === 'continuara') article.classList.add('continuation-page');
    const heading = make('h3', leaf.firstInChapter === false ? 'running-title' : '', leaf.title);
    const content = make('div', 'page-content');
    content.append(make('p', 'page-kicker', leaf.firstInChapter === false ? `${leaf.label} · continuación` : leaf.label), heading, ...leaf.paragraphs.map(p => paragraphNode(p, leaf.id)));
    if (leaf.isTitle || leaf.id === 'continuara') { const flower = make('img', 'page-flower'); flower.src = 'public/botanical.svg'; flower.alt = ''; content.append(flower); }
    const ribbon = make('span', 'leaf-ribbon'); ribbon.setAttribute('aria-hidden', 'true'); article.append(ribbon, content);
    const number = make('button', 'leaf-number', String(currentIndex + index + 1));
    number.setAttribute('aria-label', `Elegir página ${currentIndex + index + 1} para mi nota y separador`);
    number.addEventListener('click', () => selectActivePage(leaf.id));
    article.append(number); return article;
  }));
  $('#note-page-select').replaceChildren(...shown.map((leaf, index) => { const option = make('option', '', `Página ${currentIndex + index + 1}`); option.value = leaf.id; return option; }));
  selectActivePage(activePageId);
  $('#previous-page').disabled = currentIndex === 0;
  $('#next-page').disabled = currentIndex + shown.length >= pages.length;
  $('#page-number').textContent = `${currentIndex + 1}${shown.length === 2 ? `–${currentIndex + 2}` : ''} / ${pages.length}`;
  $('#reading-progress').value = ((currentIndex + shown.length) / pages.length) * 100;
  $('#reading-progress').setAttribute('aria-valuetext', `Página ${currentIndex + 1} de ${pages.length}`);
  updateBookmarkButton(); renderSaved(); updateResume();
  $$('.chapter-button').forEach(button => {
    const active = shown.some(leaf => button.dataset.chapter === leaf.chapterId || button.dataset.pageId === leaf.id);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  if (focus) pageElement.focus({ preventScroll: true });
  scrollArea.scrollTop = restoreScroll;
  state.scroll = scrollArea.scrollTop;
  saveState();
}
function goToPage(index, paragraphId) {
  if (index < 0 || index >= pages.length) return;
  currentIndex = index;
  activePageId = pages[index].id;
  if (matchMedia('(max-width:760px)').matches) $('#reader-index').open = false;
  renderPage({ focus: true });
  if (paragraphId) {
    const paragraph = $$('[data-paragraph-id]', pageElement).find(p => p.dataset.paragraphId === paragraphId);
    if (paragraph) scrollArea.scrollTop += paragraph.getBoundingClientRect().top - scrollArea.getBoundingClientRect().top - 30;
  }
  state.scroll = scrollArea.scrollTop; saveState();
}
const seenChapters = new Set();
for (const [index, page] of pages.entries()) {
  const key = page.chapterId || page.id;
  if (seenChapters.has(key)) continue;
  seenChapters.add(key);
  const button = make('button', 'chapter-button', `${page.label === page.title ? page.title : `${page.label} · ${page.title}`}   ${index + 1}`);
  button.dataset.pageId = page.id;
  if (page.chapterId) button.dataset.chapter = page.chapterId;
  button.addEventListener('click', () => goToPage(index));
  $('#chapter-list').append(button);
}
function updateBookmarkButton() {
  const saved = state.bookmarks.find(b => b.pageId === activePageId);
  $('#bookmark-page').setAttribute('aria-pressed', String(Boolean(saved)));
  const number = pages.findIndex(page => page.id === activePageId) + 1;
  $('#bookmark-page span').textContent = `${saved ? 'Quitar' : 'Separador'} · p. ${number}`;
  $('#bookmark-page').setAttribute('aria-label', `${saved ? 'Quitar' : 'Poner'} separador en la página ${number}`);
  if (saved) $('#bookmark-color').value = saved.color;
  $$('.book-page', pageElement).forEach(leaf => {
    const mark = state.bookmarks.find(b => b.pageId === leaf.dataset.leafId);
    const ribbon = $('.leaf-ribbon', leaf); ribbon.hidden = !mark;
    if (mark) ribbon.dataset.ribbonColor = mark.color;
  });
}
function selectActivePage(id) {
  activePageId = id;
  $('#note-page-select').value = id;
  $('#page-note').value = state.notes[id] || '';
  $('#note-status').textContent = '';
  $$('.leaf-number').forEach(button => button.setAttribute('aria-pressed', String(button.closest('[data-leaf-id]').dataset.leafId === id)));
  updateBookmarkButton();
}
$('#note-page-select').addEventListener('change', event => selectActivePage(event.target.value));
$('#bookmark-color').addEventListener('change', event => {
  const mark = state.bookmarks.find(b => b.pageId === activePageId);
  if (mark) { mark.color = event.target.value; saveState(); updateBookmarkButton(); renderSaved(); }
});
function savedRow(pageId, quote, remove, paragraphId, color) {
  const row = make('div', 'saved-item');
  const jump = make('button', 'saved-jump');
  if (color) { const ribbon = make('span', 'saved-ribbon'); ribbon.dataset.ribbonColor = color; ribbon.setAttribute('aria-hidden', 'true'); row.append(ribbon); }
  const index = pages.findIndex(page => page.id === pageId);
  if (quote) jump.append(make('blockquote', '', quote));
  jump.append(make('small', '', `Pág. ${index + 1} · ${pages[index].title}`));
  jump.addEventListener('click', () => goToPage(index, paragraphId));
  const removeButton = make('button', 'remove-saved', '×');
  removeButton.setAttribute('aria-label', quote ? `Eliminar resaltado: ${quote}` : `Quitar separador de la página ${index + 1}`);
  removeButton.addEventListener('click', remove);
  row.append(jump, removeButton); return row;
}
function renderSaved() {
  $('#bookmark-list').replaceChildren(...state.bookmarks.map(mark => savedRow(mark.pageId, null, () => {
    state.bookmarks = state.bookmarks.filter(item => item.pageId !== mark.pageId); saveState(); updateBookmarkButton(); renderSaved();
  }, null, mark.color)));
  if (!state.bookmarks.length) $('#bookmark-list').append(make('p', 'empty-saved', 'Aquí aparecerán las páginas a las que quieras volver.'));
  $('#highlight-list').replaceChildren(...state.highlights.map(highlight => savedRow(highlight.pageId, highlight.quote, () => {
    state.highlights = state.highlights.filter(h => h.id !== highlight.id);
    const top = scrollArea.scrollTop; renderPage({ restoreScroll: top });
  }, highlight.paragraphId)));
  if (!state.highlights.length) $('#highlight-list').append(make('p', 'empty-saved', 'Las frases que elijas se quedarán aquí.'));
}
$('#bookmark-page').addEventListener('click', () => {
  const id = activePageId;
  const existed = state.bookmarks.some(b => b.pageId === id);
  state.bookmarks = existed ? state.bookmarks.filter(item => item.pageId !== id) : [...state.bookmarks, { pageId: id, color: $('#bookmark-color').value }];
  const saved = saveState(); updateBookmarkButton(); renderSaved();
  notify(existed ? 'Separador retirado.' : saved ? 'Este pedacito de la historia ya tiene separador.' : 'Separador añadido. Descarga una copia para conservarlo.');
});
function turnPage(direction) { goToPage(Math.max(0, currentIndex + direction * (spreadMedia.matches ? 2 : 1))); }
$('#previous-page').addEventListener('click', () => turnPage(-1));
$('#next-page').addEventListener('click', () => turnPage(1));
$('#page-note').addEventListener('input', () => {
  state.notes[activePageId] = $('#page-note').value;
  $('#note-status').textContent = saveState() ? 'Nota guardada en este navegador.' : 'Descarga una copia para conservar esta nota.';
});
scrollArea.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => { state.scroll = scrollArea.scrollTop; saveState(); }, 180);
}, { passive: true });
for (const [selector, delta] of [['#font-smaller', -1], ['#font-larger', 1]]) {
  $(selector).addEventListener('click', () => { state.fontSize = Math.max(18, Math.min(32, state.fontSize + delta)); applyPreferences(); saveState(); });
}
$('#reader-theme').addEventListener('change', event => { state.theme = event.target.value; applyPreferences(); saveState(); });

// Range intersection handles selections across paragraphs and existing marks.
function captureSelection() {
  if (!reader.open) return;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!pageElement.contains(range.startContainer) || !pageElement.contains(range.endContainer)) { clearSelection(); return; }
  const selected = [];
  for (const paragraph of $$('[data-paragraph-id]', pageElement)) {
    if (!range.intersectsNode(paragraph)) continue;
    const full = document.createRange(); full.selectNodeContents(paragraph);
    const start = paragraph.contains(range.startContainer) ? (() => { const prefix = full.cloneRange(); prefix.setEnd(range.startContainer, range.startOffset); return prefix.toString().length; })() : 0;
    const end = paragraph.contains(range.endContainer) ? (() => { const prefix = full.cloneRange(); prefix.setEnd(range.endContainer, range.endOffset); return prefix.toString().length; })() : paragraph.textContent.length;
    if (end > start && paragraph.textContent.slice(start, end).trim()) selected.push({ pageId: paragraph.dataset.pageId, paragraphId: paragraph.dataset.paragraphId, start, end });
  }
  pendingSelection = selected;
  $$('[data-color]').forEach(button => { button.disabled = !selected.length; });
  $('#selection-help').textContent = selected.length ? 'Elige un color para guardar tu selección.' : 'Selecciona una frase y elige un color para resaltarla.';
}
document.addEventListener('selectionchange', captureSelection);
$$('[data-color]').forEach(button => {
  button.addEventListener('pointerdown', event => { event.preventDefault(); });
  button.addEventListener('click', () => {
    if (!pendingSelection.length) return;
    for (const selection of pendingSelection) {
      const page = pageById.get(selection.pageId);
      const paragraph = page.paragraphs.find(p => p.id === selection.paragraphId);
      // Replace only the overlapping portion; preserve the rest of prior marks.
      const next = [];
      for (const h of state.highlights) {
        if (h.pageId !== page.id || h.paragraphId !== paragraph.id || h.end <= selection.start || h.start >= selection.end) { next.push(h); continue; }
        for (const [start, end] of [[h.start, Math.min(h.end, selection.start)], [Math.max(h.start, selection.end), h.end]]) {
          if (start < end) next.push({ ...h, id: `${page.id}:${paragraph.id}:${start}:${end}`, start, end, quote: paragraph.text.slice(start, end) });
        }
      }
      next.push({ id: `${page.id}:${paragraph.id}:${selection.start}:${selection.end}`, pageId: page.id, paragraphId: paragraph.id, start: selection.start, end: selection.end, color: button.dataset.color, quote: paragraph.text.slice(selection.start, selection.end) });
      state.highlights = next;
    }
    const top = scrollArea.scrollTop;
    window.getSelection()?.removeAllRanges();
    renderPage({ restoreScroll: top });
    notify(storageAvailable ? 'Una frase más para guardar cerca.' : 'Resaltado añadido. Descarga una copia para conservarlo.');
  });
});
// Preserve a touch selection while using its toolbar, clear it for other actions.
reader.addEventListener('pointerdown', event => {
  if (!event.target.closest('.highlight-toolbar')) clearSelection();
  const leaf = event.target.closest('[data-leaf-id]');
  if (leaf) selectActivePage(leaf.dataset.leafId);
});
$('#export-notes').addEventListener('click', () => {
  state.scroll = scrollArea.scrollTop;
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = make('a'); link.href = url; link.download = 'mis-recuerdos-del-libro.json'; reader.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Copia preparada con tus notas, frases y separadores.');
});
$('#import-notes').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('El archivo es demasiado grande. Elige una copia de tus recuerdos.');
    const imported = validateState(JSON.parse(await file.text()));
    // Merge imports without overwriting notes written on this device.
    for (const mark of imported.bookmarks) if (!state.bookmarks.some(b => b.pageId === mark.pageId)) state.bookmarks.push(mark);
    for (const [id, note] of Object.entries(imported.notes)) {
      if (!state.notes[id]) state.notes[id] = note;
      else if (state.notes[id] !== note && !state.notes[id].includes(note)) state.notes[id] += `\n\n— Nota de la copia —\n${note}`;
    }
    for (const h of imported.highlights) {
      if (!state.highlights.some(existing => existing.pageId === h.pageId && existing.paragraphId === h.paragraphId && existing.start < h.end && existing.end > h.start)) state.highlights.push(h);
    }
    renderPage({ restoreScroll: scrollArea.scrollTop });
    notify(storageAvailable ? 'Tus recuerdos se han añadido sin borrar los que ya tenías.' : 'Copia restaurada. Descárgala de nuevo antes de cerrar.');
  } catch (error) { notify(error instanceof SyntaxError ? 'No pudimos leer esa copia. Elige el archivo JSON que descargaste.' : error.message); }
  event.target.value = '';
});
function openReader() {
  if (reader.open) return;
  applyPreferences();
  if (matchMedia('(max-width:760px)').matches) $('#reader-index').open = false;
  reader.showModal(); syncScrollLock();
  renderPage({ restoreScroll: state.scroll });
  $('#close-reader').focus();
}
$('#open-reader').addEventListener('click', openReader);
function closeReader() { clearTimeout(scrollTimer); state.scroll = scrollArea.scrollTop; saveState(); reader.close(); }
$('#close-reader').addEventListener('click', closeReader);
reader.addEventListener('cancel', event => { event.preventDefault(); closeReader(); });
reader.addEventListener('close', () => { clearTimeout(scrollTimer); clearSelection(); syncScrollLock(); updateResume(); });
reader.addEventListener('keydown', event => {
  if (event.target.closest('textarea,input,select,button,summary') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !window.getSelection()?.isCollapsed) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); turnPage(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); turnPage(-1); }
});
spreadMedia.addEventListener('change', () => { if (reader.open) { if (matchMedia('(max-width:760px)').matches) $('#reader-index').open = false; renderPage({ restoreScroll: scrollArea.scrollTop }); } });
window.addEventListener('pagehide', () => { if (reader.open) state.scroll = scrollArea.scrollTop; saveState(); });
if (book.manuscriptAvailable) {
  $('#reader-title').textContent = book.title;
  $('#open-reader').replaceChildren(document.createTextNode('Abrir nuestro libro '), make('span', '', '↗'));
  $('#manuscript-status').textContent = 'Dedicatoria, prólogo y diez capítulos. Un libro que sigo escribiendo, para que conozcas un poquito más de mí.';
}
applyPreferences(); updateResume();
