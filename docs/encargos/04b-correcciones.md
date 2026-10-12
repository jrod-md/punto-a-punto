# Encargo 4b — Correcciones del PR 1

Lee primero `AGENTS.md`. Trabaja en la misma rama `encargo-04-patron-y-tejer` y sube los commits al PR 1 existente. No abras otro PR.

## 1. Bloqueante: la app publicada no vuelve a abrir

En la vista previa de Cloudflare Pages (`https://encargo-04-patron-y-tejer.punto-a-punto.pages.dev/`), la primera visita funciona y la segunda navegación falla. Comprobado en el navegador.

Causa: Cloudflare Pages responde a `/index.html` con una redirección 308 hacia `/`. El service worker precarga `/index.html`, así que guarda una respuesta con `redirected: true`, y luego la entrega a las peticiones de navegación. El navegador rechaza una respuesta redirigida para una navegación. `npm run preview` no redirige, por eso no apareció en local.

Lo que se pide:

- La respuesta que se entrega a una navegación nunca puede tener `redirected: true`. Precarga el documento desde `/` o reconstruye la respuesta antes de guardarla; elige lo más simple y explícalo.
- Si la caché no tiene el documento o está dañada, la navegación va a la red. Un service worker defectuoso nunca debe dejar la app sin abrir cuando hay conexión.
- Añade una prueba que reproduzca el caso: un servidor que redirige `/index.html` y una segunda navegación que debe funcionar.
- Verifica en la URL de vista previa de Cloudflare, no solo en local: abrir, recargar tres veces, cerrar la pestaña y volver a abrir, y recargar sin conexión. Los proyectos deben seguir ahí. Un navegador que ya tenga el service worker defectuoso de esta rama debe recuperarse solo al recibir el corregido; compruébalo también.

## 2. Formato del código

Varios archivos nuevos tienen el código comprimido en líneas muy largas, sin espacios ni saltos (`src/pwa/worker.ts`, `src/pwa/register.ts`, `scripts/pwaPlugin.ts`, entre otros). Pasa el lint, pero no se puede leer ni revisar.

- Añade Prettier con una configuración mínima y los scripts `format` y `format:check`.
- Formatea todo el repositorio en un commit aparte que solo contenga cambios de formato.
- `npm run format:check` pasa a ser el quinto comando obligatorio antes de terminar.

## 3. Modo tejer: controles sobre la cuadrícula

A 375 × 812, los botones de alejar, acercar y ver completa quedan encima de la cuadrícula y tapan celdas de las filas siguientes. Colócalos donde no cubran la cuadrícula.

## Criterios de aceptación

- Los cinco comandos terminan en verde.
- En la vista previa de Cloudflare, el recorrido del punto 1 funciona completo, con y sin conexión, y lo documentas con lo que observaste.
- El commit de formato no cambia comportamiento: las pruebas pasan igual antes y después.
- No se añade nada fuera de estos tres puntos.
