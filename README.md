# My Kind of Woman

Álbum y libro en HTML, CSS y JavaScript, sin dependencias de ejecución.

## Vista previa

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Abre `http://127.0.0.1:4173`. El lector se muestra dentro de la sección del libro.

## Libro

- El original está en `content/manuscrito.md`. Para actualizar `book.js`, ejecuta `python3 scripts/build_book.py`.
- `reader.js` distribuye el texto según las dimensiones reales de las hojas y la tipografía. Los saltos pueden cambiar según el dispositivo; el contenido no se recorta.
- `reader.css` define la altura fija de las hojas: 660 px en escritorio, 570 px en móvil y 550 px en pantallas de hasta 360 px. Aumentar la letra crea más páginas sin aumentar esa altura.
- Los resaltados, separadores, notas y posición se vinculan a párrafos y posiciones de texto. Se conservan al redistribuir las páginas. Las marcas de la versión anterior se migran automáticamente sin borrar su copia original.
- Los datos se guardan en el navegador. El índice permite descargar y restaurar respaldos; no hay sincronización automática entre dispositivos.
- El giro utiliza Web Animations API durante 280 ms. Las pulsaciones rápidas cancelan el giro anterior. La navegación por teclado y la preferencia de movimiento reducido cambian la página directamente.

## Pruebas

```sh
npm ci
npx playwright install chromium
npm test
```

Las pruebas comprueban la integridad del manuscrito, la galería, la paginación sin pérdida de texto, alturas fijas, anchos de 320 a 1440 px, letra grande, resaltados entre hojas, respaldos, migración, guardado local y animación.
