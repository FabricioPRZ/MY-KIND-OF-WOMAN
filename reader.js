'use strict';

(() => {
  const book = window.RELATIONSHIP_BOOK;
  const root = $('#reader');
  const spread = $('#book-page');
  const stage = $('#reader-scroll');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['yellow', 'pink', 'green'];
  const ribbonColors = ['pink', 'yellow', 'green', 'blue', 'lilac'];
  const themes = ['paper', 'rose', 'night'];
  const continuation = {
    id: 'continuara', chapterId: 'continuara', label: 'Una pausa, no un final', title: 'Continuará, contigo.',
    paragraphs: [
      { id: 'end-1', text: 'Si llegaste hasta aquí, ya conoces un poco más de todo lo que nunca supe decirte.' },
      { id: 'end-2', text: 'Este libro todavía no está terminado. Sigo escribiéndolo, despacio, entre los recuerdos que vuelven y los días que seguimos compartiendo.' },
      { id: 'end-3', text: 'Aún me quedan cosas por contarte, palabras por encontrar y muchas páginas que quiero dedicarte. Guarda aquí tu separador; cuando vuelvas, espero tener un poquito más de nosotros para ti.' },
      { id: 'end-4', text: 'Gracias por leerme. Por estar en estas páginas y, sobre todo, en mi vida.' },
      { id: 'end-5', text: 'La próxima página todavía la estoy escribiendo.' },
      { id: 'end-6', text: 'Con todo mi amor,\nFabricio.' }
    ]
  };
  const sourcePages = [...book.pages, continuation];
  const sourcePageMap = new Map(sourcePages.map(p => [p.id, p]));
  const paragraphs = new Map();
  const chapters = [];
  for (const page of sourcePages) {
    let chapter = chapters.find(c => c.id === page.chapterId);
    if (!chapter) {
      chapter = { id: page.chapterId, label: page.label, title: page.title, isTitle: page.isTitle, paragraphs: [] };
      chapters.push(chapter);
    }
    for (const p of page.paragraphs) {
      const paragraph = { ...p, chapterId: chapter.id };
      paragraphs.set(p.id, paragraph);
      chapter.paragraphs.push(paragraph);
    }
  }
  const firstParagraph = chapters[0].paragraphs[0].id;
  const storageKey = `mkow-reader-v2:${book.id}`;
  const legacyKey = `mkow-reader-v1:${book.id}`;
  const anchorKey = anchor => `${anchor.paragraphId}@${anchor.offset}`;
  const validAnchor = anchor => anchor && paragraphs.has(anchor.paragraphId) && Number.isInteger(anchor.offset) && anchor.offset >= 0 && anchor.offset < paragraphs.get(anchor.paragraphId).text.length;
  const originalAnchor = id => ({ paragraphId: sourcePageMap.get(id)?.paragraphs[0]?.id || firstParagraph, offset: 0 });
  const freshState = () => ({ version: 2, bookId: book.id, position: { paragraphId: firstParagraph, offset: 0 }, fontSize: 19, theme: 'paper', bookmarks: [], highlights: [], notes: [] });
  function migrate(input) {
    if (input.version !== 1) return input;
    const result = { ...freshState(), theme: input.theme, fontSize: input.fontSize, position: originalAnchor(input.pageId) };
    result.bookmarks = (input.bookmarks || []).map(b => ({ ...originalAnchor(typeof b === 'string' ? b : b.pageId), color: b.color || 'pink' }));
    result.highlights = input.highlights || [];
    result.notes = Object.entries(input.notes || {}).map(([id, text]) => ({ ...originalAnchor(id), text }));
    return result;
  }
  function validate(input) {
    if (!input || input.bookId !== book.id || ![1, 2].includes(input.version)) throw Error('Esta copia no pertenece a este libro.');
    input = migrate(input);
    const result = freshState();
    if (validAnchor(input.position)) result.position = { paragraphId: input.position.paragraphId, offset: input.position.offset };
    result.theme = themes.includes(input.theme) ? input.theme : 'paper';
    result.fontSize = Number.isFinite(input.fontSize) ? Math.max(16, Math.min(26, input.fontSize)) : 19;
    for (const b of (Array.isArray(input.bookmarks) ? input.bookmarks : []).slice(0, 10000)) {
      if (validAnchor(b) && !result.bookmarks.some(item => anchorKey(item) === anchorKey(b))) result.bookmarks.push({ paragraphId: b.paragraphId, offset: b.offset, color: ribbonColors.includes(b.color) ? b.color : 'pink' });
    }
    for (const h of (Array.isArray(input.highlights) ? input.highlights : []).slice(0, 20000)) {
      const p = paragraphs.get(h?.paragraphId);
      if (!p || !Number.isInteger(h.start) || !Number.isInteger(h.end) || h.start < 0 || h.end > p.text.length || h.start >= h.end || !colors.includes(h.color) || h.quote !== p.text.slice(h.start, h.end)) continue;
      if (result.highlights.some(item => item.paragraphId === h.paragraphId && item.start < h.end && item.end > h.start)) continue;
      result.highlights.push({ paragraphId: h.paragraphId, start: h.start, end: h.end, color: h.color, quote: h.quote, id: `${h.paragraphId}:${h.start}:${h.end}` });
    }
    for (const note of (Array.isArray(input.notes) ? input.notes : []).slice(0, 10000)) {
      if (validAnchor(note) && typeof note.text === 'string' && !result.notes.some(n => anchorKey(n) === anchorKey(note))) result.notes.push({ paragraphId: note.paragraphId, offset: note.offset, text: note.text.slice(0, 10000) });
    }
    return result;
  }
  let state = freshState();
  let storageAvailable = true;
  try {
    const raw = localStorage.getItem(storageKey) || localStorage.getItem(legacyKey);
    if (raw) state = validate(JSON.parse(raw));
  } catch { storageAvailable = false; }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); storageAvailable = true; }
    catch { storageAvailable = false; }
    $('#storage-status').textContent = storageAvailable
      ? 'Tus marcas y notas se guardan en este navegador. Descarga una copia para conservarlas o llevarlas a otro dispositivo.'
      : 'Este navegador no permite guardar. Descarga una copia antes de salir para conservar tus marcas y notas.';
    return storageAvailable;
  }
  let pages = [];
  let current = 0;
  let active = 0;
  let count = 1;
  let selectedNote = null;
  let pendingSelection = [];
  let turning = null;
  let turnElement = null;
  let lastGeometry = '';
  let resizeTimer;
  const pageAnchor = page => ({ paragraphId: page.segments[0].paragraphId, offset: page.segments[0].start });
  function locate(anchor) {
    if (!anchor) return 0;
    const found = pages.findIndex(page => page.segments.some(s => s.paragraphId === anchor.paragraphId && s.start <= anchor.offset && s.end > anchor.offset));
    return found < 0 ? 0 : found;
  }
  function segmentNode(segment, decorated = true) {
    const source = paragraphs.get(segment.paragraphId);
    const p = make('p', segment.start ? 'continued-paragraph' : '');
    p.dataset.paragraphId = source.id;
    p.dataset.start = segment.start;
    p.dataset.end = segment.end;
    const marks = decorated ? state.highlights.filter(h => h.paragraphId === source.id && h.end > segment.start && h.start < segment.end) : [];
    const formats = (source.formats || []).filter(f => f.end > segment.start && f.start < segment.end);
    const points = [...new Set([segment.start, segment.end, ...[...marks, ...formats].flatMap(h => [Math.max(segment.start, h.start), Math.min(segment.end, h.end)])])].sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i], end = points[i + 1];
      let node = document.createTextNode(source.text.slice(start, end));
      const format = formats.find(f => f.start <= start && f.end >= end);
      if (format) { const el = make(format.tag === 'strong' ? 'strong' : 'em'); el.append(node); node = el; }
      const highlight = marks.find(h => h.start <= start && h.end >= end);
      if (highlight) { const el = make('mark'); el.dataset.color = highlight.color; el.dataset.highlightId = highlight.id; el.append(node); node = el; }
      p.append(node);
    }
    return p;
  }
  function leafShell(page, number = 0) {
    const leaf = make('article', `paper-leaf${page.chapter.isTitle && page.first ? ' title-leaf' : ''}`);
    leaf.dataset.pageIndex = number;
    leaf.setAttribute('aria-label', `Página ${number + 1}: ${page.chapter.title}`);
    leaf.append(make('div', 'paper-running-head', page.first ? page.chapter.label : `${page.chapter.label} · continuación`));
    const text = make('div', 'paper-text');
    if (page.first) text.append(make('h4', '', page.chapter.title));
    leaf.append(text);
    const numberButton = make('button', 'paper-number', String(number + 1));
    numberButton.setAttribute('aria-label', `Elegir página ${number + 1} para mi nota y separador`);
    numberButton.addEventListener('click', () => selectPage(number));
    leaf.append(numberButton);
    return leaf;
  }
  function applyPreferences() {
    root.dataset.theme = state.theme;
    root.style.setProperty('--reader-size', `${state.fontSize}px`);
    $('#reader-theme').value = state.theme;
    $('#font-smaller').disabled = state.fontSize <= 16;
    $('#font-larger').disabled = state.fontSize >= 26;
  }
  function cancelTurn() {
    if (turning) turning.cancel();
    turning = null;
    turnElement?.remove();
    turnElement = null;
  }
  // Measure with the same paper, typography and available height as visible leaves.
  // Split at word boundaries; annotations always retain original paragraph offsets.
  function paginate(force = false) {
    applyPreferences();
    const available = stage.clientWidth - parseFloat(getComputedStyle(stage).paddingLeft) - parseFloat(getComputedStyle(stage).paddingRight);
    const nextCount = available >= 850 ? 2 : 1;
    count = nextCount;
    spread.classList.toggle('two-pages', count === 2);
    const width = spread.getBoundingClientRect().width / count;
    const height = parseFloat(getComputedStyle(root).getPropertyValue('--leaf-height'));
    const geometry = `${width}:${height}:${state.fontSize}:${count}`;
    if (!force && geometry === lastGeometry) return;
    if (width < 120) return;
    lastGeometry = geometry;
    cancelTurn();
    clearSelection();
    const probe = make('div', 'pagination-probe');
    probe.style.width = `${width}px`;
    probe.setAttribute('aria-hidden', 'true');
    probe.inert = true;
    stage.append(probe);
    const result = [];
    for (const chapter of chapters) {
      let page, leaf, text;
      const newPage = () => {
        page = { chapter, first: !result.some(p => p.chapter.id === chapter.id), segments: [] };
        leaf = leafShell(page); text = $('.paper-text', leaf); probe.replaceChildren(leaf);
      };
      const finish = () => { if (page.segments.length) result.push(page); newPage(); };
      newPage();
      for (const paragraph of chapter.paragraphs) {
        let start = 0;
        while (start < paragraph.text.length) {
          const whole = { paragraphId: paragraph.id, start, end: paragraph.text.length };
          let node = segmentNode(whole, false); text.append(node);
          if (text.scrollHeight <= text.clientHeight) {
            page.segments.push(whole); start = whole.end; continue;
          }
          node.remove();
          const offsets = [];
          const matcher = /\S+\s*/g;
          matcher.lastIndex = start;
          while (matcher.exec(paragraph.text)) offsets.push(matcher.lastIndex);
          let low = 0, high = offsets.length - 1, best = -1;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            node = segmentNode({ paragraphId: paragraph.id, start, end: offsets[mid] }, false);
            text.append(node);
            const fits = text.scrollHeight <= text.clientHeight;
            node.remove();
            if (fits) { best = mid; low = mid + 1; } else high = mid - 1;
          }
          if (best < 0 || (page.segments.length && offsets[best] - start < 45)) {
            if (!page.segments.length) throw Error('No hay espacio suficiente para una línea de lectura.');
            finish(); continue;
          }
          const part = { paragraphId: paragraph.id, start, end: offsets[best] };
          text.append(segmentNode(part, false)); page.segments.push(part); start = part.end;
          finish();
        }
      }
      if (page.segments.length) result.push(page);
    }
    probe.remove();
    pages = result;
    active = locate(state.position);
    current = Math.floor(active / count) * count;
    buildIndex(); render();
    $('#pagination-status').hidden = true;
  }
  function buildIndex() {
    $('#chapter-list').replaceChildren(...chapters.map(chapter => {
      const index = pages.findIndex(p => p.chapter.id === chapter.id);
      const button = make('button', 'chapter-button'); button.dataset.chapter = chapter.id;
      const title = make('span');
      if (chapter.title !== chapter.label) title.append(make('small', '', chapter.label));
      title.append(document.createTextNode(chapter.title));
      button.append(title, make('span', 'chapter-number', String(index + 1)));
      button.addEventListener('click', () => { jump(index); $('#reader-index').open = false; stage.scrollIntoView({ block: 'start', behavior: 'instant' }); });
      return button;
    }));
  }
  function render() {
    if (!pages.length) return;
    clearSelection();
    const shown = pages.slice(current, current + count);
    spread.replaceChildren(...shown.map((page, offset) => {
      const index = current + offset;
      const leaf = leafShell(page, index);
      $('.paper-text', leaf).append(...page.segments.map(s => segmentNode(s)));
      const ribbon = make('span', 'paper-ribbon'); ribbon.setAttribute('aria-hidden', 'true'); leaf.append(ribbon);
      return leaf;
    }));
    if (shown.length < count) {
      const blank = make('div', 'paper-leaf blank-leaf'); blank.setAttribute('aria-hidden', 'true'); spread.append(blank);
    }
    $('#note-page-select').replaceChildren(...shown.map((p, i) => { const option = make('option', '', String(current + i + 1)); option.value = current + i; return option; }));
    if (active < current || active >= current + shown.length) active = current;
    selectPage(active, false);
    $('#previous-page').disabled = current === 0;
    $('#next-page').disabled = current + count >= pages.length;
    $('#page-number').textContent = `${current + 1}${shown.length > 1 ? `–${current + shown.length}` : ''} / ${pages.length}`;
    $('#reading-progress').value = ((current + shown.length) / pages.length) * 100;
    $('#reading-progress').setAttribute('aria-valuetext', $('#page-number').textContent);
    $$('#chapter-list button').forEach(b => { if (shown.some(p => p.chapter.id === b.dataset.chapter)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('#resume-label').textContent = `Tu lugar: página ${active + 1} de ${pages.length}. Puedes volver cuando quieras.`;
    renderSaved(); save();
  }
  function selectPage(index, remember = true) {
    if (!pages[index]) return;
    active = index;
    $('#note-page-select').value = String(index);
    if (remember) state.position = pageAnchor(pages[index]);
    selectedNote = state.notes.find(n => locate(n) === active) || null;
    $('#page-note').value = selectedNote?.text || '';
    $('#note-page-label').textContent = `Tu nota · página ${index + 1}`;
    $('#note-status').textContent = '';
    $$('.paper-number', spread).forEach(b => b.setAttribute('aria-pressed', String(Number(b.closest('.paper-leaf').dataset.pageIndex) === active)));
    updateBookmarks();
    if (remember) save();
  }
  function updateBookmarks() {
    const mark = state.bookmarks.find(b => locate(b) === active);
    $('#bookmark-page').setAttribute('aria-pressed', String(Boolean(mark)));
    $('#bookmark-page span').textContent = mark ? 'Quitar separador' : 'Poner separador';
    $('#bookmark-page').setAttribute('aria-label', `${mark ? 'Quitar' : 'Poner'} separador en la página ${active + 1}`);
    if (mark) $('#bookmark-color').value = mark.color;
    $$('.paper-leaf[data-page-index]', spread).forEach(leaf => {
      const ribbon = $('.paper-ribbon', leaf);
      if (!ribbon) return;
      const saved = state.bookmarks.find(b => locate(b) === Number(leaf.dataset.pageIndex));
      ribbon.hidden = !saved;
      if (saved) ribbon.dataset.ribbonColor = saved.color;
    });
  }
  function jump(index, animate = false, direction = 1) {
    if (index < 0 || index >= pages.length) return;
    cancelTurn();
    const oldLeaves = $$('.paper-leaf[data-page-index]', spread);
    const oldFront = oldLeaves[direction > 0 ? oldLeaves.length - 1 : 0]?.cloneNode(true);
    active = index; current = Math.floor(index / count) * count;
    state.position = pageAnchor(pages[index]);
    render();
    if (!animate || reducedMotion.matches || !oldFront) return;
    // The visible state changes immediately. This disposable leaf provides the turn;
    // a second click cancels it and advances from the already-current page.
    const overlay = make('div', 'turning-leaf');
    overlay.setAttribute('aria-hidden', 'true'); overlay.inert = true;
    const half = count === 2;
    overlay.style.width = half ? '50%' : '100%';
    overlay.style.left = half && direction > 0 ? '50%' : '0';
    overlay.style.transformOrigin = direction > 0 ? 'left center' : 'right center';
    oldFront.append(make('span', 'turn-shade'));
    const newLeaf = $$('.paper-leaf[data-page-index]', spread)[direction > 0 ? 0 : count - 1]?.cloneNode(true) || oldFront.cloneNode(true);
    newLeaf.classList.add('turn-back');
    overlay.append(oldFront, newLeaf); spread.append(overlay);
    turnElement = overlay;
    const rotation = direction > 0 ? -180 : 180;
    const animation = overlay.animate([{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: `rotateY(${rotation}deg)`, opacity: half ? 1 : 0 }], { duration: 280, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' });
    turning = animation;
    animation.finished.then(() => { overlay.remove(); if (turning === animation) { turning = null; turnElement = null; } }).catch(() => { });
  }
  function turn(direction, animate) { jump(current + direction * count, animate, direction); }
  $('#previous-page').addEventListener('click', e => turn(-1, e.detail > 0));
  $('#next-page').addEventListener('click', e => turn(1, e.detail > 0));
  spread.addEventListener('keydown', e => {
    if (e.target.closest('button') || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || !getSelection()?.isCollapsed) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); turn(e.key === 'ArrowRight' ? 1 : -1, false); }
  });
  $('#note-page-select').addEventListener('change', e => selectPage(Number(e.target.value)));
  $('#bookmark-page').addEventListener('click', () => {
    if (!pages.length) return;
    const exists = state.bookmarks.some(b => locate(b) === active);
    state.bookmarks = exists ? state.bookmarks.filter(b => locate(b) !== active) : [...state.bookmarks, { ...pageAnchor(pages[active]), color: $('#bookmark-color').value }];
    updateBookmarks(); renderSaved(); const saved = save();
    notify(exists ? 'Separador retirado.' : saved ? 'Tu separador se quedará junto a estas palabras.' : 'Descarga una copia para conservar este separador.');
  });
  $('#bookmark-color').addEventListener('change', e => { state.bookmarks.filter(b => locate(b) === active).forEach(b => { b.color = e.target.value; }); updateBookmarks(); renderSaved(); save(); });
  $('#page-note').addEventListener('input', () => {
    if (!pages.length) return;
    if (!selectedNote) { selectedNote = { ...pageAnchor(pages[active]), text: '' }; state.notes.push(selectedNote); }
    selectedNote.text = $('#page-note').value;
    $('#note-status').textContent = save() ? 'Nota guardada en este navegador.' : 'Descarga una copia para conservar esta nota.';
    renderSaved();
  });
  function savedRow(anchor, quote, remove, color, note = null) {
    const index = locate(anchor);
    const row = make('div', 'saved-item');
    if (color) { const ribbon = make('span', 'saved-ribbon'); ribbon.dataset.ribbonColor = color; ribbon.setAttribute('aria-hidden', 'true'); row.append(ribbon); }
    const jumpButton = make('button', 'saved-jump');
    if (quote) jumpButton.append(make('blockquote', '', quote));
    jumpButton.append(make('small', '', `Pág. ${index + 1} · ${pages[index].chapter.title}`));
    jumpButton.addEventListener('click', () => {
      jump(index); $('#reader-index').open = false;
      if (note) { selectedNote = note; $('#page-note').value = note.text; $('#note-panel').open = true; $('#page-note').focus(); }
      else stage.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    const removeButton = make('button', 'remove-saved', '×');
    removeButton.setAttribute('aria-label', quote ? `Eliminar: ${quote}` : `Quitar separador de la página ${index + 1}`);
    removeButton.addEventListener('click', remove);
    row.append(jumpButton, removeButton); return row;
  }
  function renderSaved() {
    if (!pages.length) return;
    $('#bookmark-list').replaceChildren(...state.bookmarks.map(b => savedRow(b, null, () => { state.bookmarks = state.bookmarks.filter(x => x !== b); updateBookmarks(); renderSaved(); save(); }, b.color)));
    $('#highlight-list').replaceChildren(...state.highlights.map(h => savedRow({ paragraphId: h.paragraphId, offset: h.start }, h.quote, () => { state.highlights = state.highlights.filter(x => x !== h); render(); })));
    $('#notes-list').replaceChildren(...state.notes.filter(n => n.text.trim()).map(n => savedRow(n, n.text.slice(0, 120), () => { state.notes = state.notes.filter(x => x !== n); render(); }, null, n)));
    for (const [id, message] of [['#bookmark-list', 'Tus páginas favoritas se quedarán aquí.'], ['#highlight-list', 'Aquí aparecerán las frases que resaltes.'], ['#notes-list', 'Un espacio para lo que te haga sentir el libro.']]) if (!$(id).childElementCount) $(id).append(make('p', 'empty-saved', message));
  }
  function clearSelection() {
    pendingSelection = [];
    $$('[data-highlight-color]').forEach(b => { b.disabled = true; });
    $('#selection-help').textContent = 'Selecciona una frase para resaltarla.';
  }
  document.addEventListener('selectionchange', () => {
    const selection = getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!spread.contains(range.startContainer) || !spread.contains(range.endContainer)) { clearSelection(); return; }
    const selected = [];
    for (const p of $$('.paper-text p[data-paragraph-id]', spread)) {
      if (p.closest('.turning-leaf') || !range.intersectsNode(p)) continue;
      const whole = document.createRange(); whole.selectNodeContents(p);
      const offsetAt = (node, offset) => { const prefix = whole.cloneRange(); prefix.setEnd(node, offset); return prefix.toString().length; };
      const start = p.contains(range.startContainer) ? offsetAt(range.startContainer, range.startOffset) : 0;
      const end = p.contains(range.endContainer) ? offsetAt(range.endContainer, range.endOffset) : p.textContent.length;
      if (end > start && p.textContent.slice(start, end).trim()) selected.push({ paragraphId: p.dataset.paragraphId, start: Number(p.dataset.start) + start, end: Number(p.dataset.start) + end });
    }
    pendingSelection = selected;
    $$('[data-highlight-color]').forEach(b => { b.disabled = !selected.length; });
    if (selected.length) $('#selection-help').textContent = 'Elige un color para guardar tu selección.';
  });
  root.addEventListener('pointerdown', e => {
    if (!e.target.closest('.reading-highlighter')) clearSelection();
    const leaf = e.target.closest('.paper-leaf[data-page-index]');
    if (leaf && !leaf.closest('.turning-leaf')) selectPage(Number(leaf.dataset.pageIndex));
  });
  $$('[data-highlight-color]').forEach(button => {
    button.addEventListener('pointerdown', e => e.preventDefault());
    button.addEventListener('click', () => {
      if (!pendingSelection.length) return;
      for (const part of pendingSelection) {
        const source = paragraphs.get(part.paragraphId);
        const next = [];
        for (const h of state.highlights) {
          if (h.paragraphId !== part.paragraphId || h.end <= part.start || h.start >= part.end) { next.push(h); continue; }
          for (const [start, end] of [[h.start, Math.min(h.end, part.start)], [Math.max(h.start, part.end), h.end]]) if (start < end) next.push({ ...h, start, end, quote: source.text.slice(start, end), id: `${source.id}:${start}:${end}` });
        }
        next.push({ ...part, color: button.dataset.highlightColor, quote: source.text.slice(part.start, part.end), id: `${source.id}:${part.start}:${part.end}` });
        state.highlights = next;
      }
      getSelection()?.removeAllRanges(); render();
      notify(storageAvailable ? 'Una frase más para guardar cerca.' : 'Descarga una copia para conservar tu resaltado.');
    });
  });
  for (const [id, amount] of [['#font-smaller', -1], ['#font-larger', 1]]) $(id).addEventListener('click', () => { state.fontSize = Math.max(16, Math.min(26, state.fontSize + amount)); paginate(); });
  $('#reader-theme').addEventListener('change', e => { state.theme = e.target.value; applyPreferences(); save(); });
  $('#open-reader').addEventListener('click', () => { root.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' }); });
  $('#export-notes').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = make('a');
    link.href = url; link.download = 'mis-recuerdos-del-libro.json'; root.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Copia preparada con tus notas, frases y separadores.');
  });
  $('#import-notes').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('El archivo es demasiado grande. Elige una copia de tus recuerdos.');
      const imported = validate(JSON.parse(await file.text()));
      for (const b of imported.bookmarks) if (!state.bookmarks.some(x => anchorKey(x) === anchorKey(b))) state.bookmarks.push(b);
      for (const h of imported.highlights) if (!state.highlights.some(x => x.paragraphId === h.paragraphId && x.start < h.end && x.end > h.start)) state.highlights.push(h);
      for (const n of imported.notes) {
        const existing = state.notes.find(x => anchorKey(x) === anchorKey(n));
        if (!existing) state.notes.push(n);
        else if (existing.text !== n.text && !existing.text.includes(n.text)) existing.text = `${existing.text}\n\n— Nota de la copia —\n${n.text}`.slice(0, 10000);
      }
      render(); notify(storageAvailable ? 'Tus recuerdos se han añadido sin borrar los que ya tenías.' : 'Copia restaurada. Descárgala antes de salir.');
    } catch (error) { notify(error instanceof SyntaxError ? 'No pudimos leer esa copia. Elige el archivo JSON que descargaste.' : error.message); }
    e.target.value = '';
  });
  window.addEventListener('pagehide', save);
  const schedulePagination = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => paginate(), 120); };
  new ResizeObserver(schedulePagination).observe(stage);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) cancelTurn(); });
  applyPreferences();
  // A late webfont must trigger re-measurement, not leave overflowing pages behind.
  paginate();
  document.fonts.ready.then(() => paginate(true));
})();
