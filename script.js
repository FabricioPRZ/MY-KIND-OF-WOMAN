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
