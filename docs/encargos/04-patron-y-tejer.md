# Encargo 4 — Patrón escrito y modo tejer

Lee primero `AGENTS.md` y `docs/SPEC.md`.

## Objetivo

Que la usuaria pueda llevarse el patrón de su diseño y seguirlo en el celular mientras teje, sin perderse de fila ni de punto. Corresponde a las pantallas 5 y 6 de la especificación.

## Parte A — Patrón

- Pantalla "Patrón" a la que se entra desde el editor.
- Encabezado con nombre, tamaño en puntos y filas, tamaño real, muestra usada y si se teje en plano o en redondo.
- Leyenda: letra, muestra del color y nombre.
- Lista de hilo por color, con el mismo cálculo y las mismas advertencias del panel de hilo.
- Texto fila por fila generado con `src/core/pattern.ts`, con la fila 1 primero. Las filas consecutivas idénticas no se agrupan: cada fila tiene su línea.
- Acciones:
  - Copiar el patrón como texto.
  - Descargar la cuadrícula como imagen PNG, con numeración y leyenda, legible al ampliarla.
  - Descargar un PDF con encabezado, leyenda, hilo, cuadrícula y texto. La cuadrícula se reparte en varias páginas si no cabe legible en una, con la numeración repetida en cada página.
- Para el PDF puedes añadir una dependencia; cárgala solo cuando se pida el PDF y justifícala en el informe.

## Parte B — Modo tejer

- Se entra desde el editor y desde la lista de proyectos. Ocupa toda la pantalla, sin desplazamiento de página.
- Muestra la cuadrícula con la fila actual resaltada y las demás atenuadas, y mantiene la fila actual a la vista.
- Dentro de la fila actual, los puntos ya hechos se distinguen de los pendientes, respetando el sentido de lectura de esa fila.
- Indica: número de fila, sentido de lectura con flecha, puntos hechos y totales, y el tramo actual en palabras ("Vas en: 5 de Rojo. Sigue: 3 de Blanco").
- Un botón grande, alcanzable con el pulgar, avanza el paso elegido. El paso se elige entre 1, 5, 10 y "tramo de color" (avanza hasta el próximo cambio de color). Por defecto, 5. Se guarda en `tapStep`; amplía el tipo si hace falta para el tramo de color y justifícalo.
- Botones secundarios: avanzar 1 punto, deshacer el último avance, terminar la fila y volver a la fila anterior.
- Un avance nunca pasa del final de la fila: se detiene ahí y pide confirmar el paso a la siguiente con un toque.
- Al terminar la última fila, un mensaje de pieza terminada.
- El progreso se guarda solo y se conserva al cerrar y volver. Si el dibujo o las medidas cambian después, el progreso se ajusta para seguir siendo válido.
- La pantalla no se apaga mientras el modo tejer está abierto, donde el navegador lo permita; si no lo permite, no se muestra ningún error.
- "Reiniciar progreso" con confirmación.

La lógica del avance (pasos, tramo de color, límites de fila, deshacer, ajuste tras cambios) va en funciones puras con pruebas.

## Parte C — Instalable en iPhone

La usuaria usa iPhone y recibirá la app como un enlace que abre en Safari y agrega a su pantalla de inicio. Safari puede borrar los datos de una web que no se visita en varios días, salvo que esté agregada al inicio, así que esta parte protege sus diseños.

- Manifiesto de aplicación web, iconos (incluido `apple-touch-icon`) y las etiquetas necesarias para que, agregada al inicio en iOS, se abra a pantalla completa con su nombre e icono.
- Funciona sin conexión después de la primera visita. Cuando hay una versión nueva, se aplica en la siguiente apertura sin perder datos.
- Pide almacenamiento persistente con `navigator.storage.persist()` donde exista, sin mostrar errores si se niega.
- Respeta las zonas seguras del iPhone (muesca y barra inferior) en el editor y en el modo tejer.
- Los campos de texto no provocan el zoom automático de Safari al enfocarlos, y el doble toque no amplía la página en el editor ni en el modo tejer.
- Si la app se abre en Safari de iOS sin estar agregada al inicio, muestra una sola vez un aviso breve que explica cómo agregarla y por qué conviene. Se puede cerrar.
- En la lista de proyectos, un recordatorio discreto de exportar un respaldo si hay proyectos sin respaldar desde hace más de 7 días.
- El sitio se publica en Cloudflare Pages desde la raíz del dominio, con `npm run build` y la carpeta `dist`. Comprueba que la compilación funciona servida desde `/` con `npm run preview`.

## Criterios de aceptación

- Con `npm run preview`, la app se instala desde un navegador de escritorio y vuelve a abrir sin conexión con los proyectos intactos.

- Los cuatro comandos de `AGENTS.md` terminan en verde.
- En un proyecto en plano de 10 columnas cuya fila 1, vista de izquierda a derecha, es 3 A, 2 B, 5 A: el patrón dice "Fila 1 (← derecha a izquierda): 5 A, 2 B, 3 A — 10 puntos" y el modo tejer, con paso "tramo de color", avanza 5, luego 2, luego 3.
- Con paso 5 en una fila de 12 puntos, los avances son 5, 5 y 2, y el siguiente toque pide pasar de fila.
- Deshacer tras pasar de fila vuelve al final de la fila anterior.
- Cerrar la pestaña en la fila 7, punto 10, y volver a abrir el modo tejer muestra la fila 7, punto 10.
- El PDF de un proyecto de 64 × 72 se abre y se lee; el de 200 × 200 reparte la cuadrícula en varias páginas.
- A 375 × 812 no hay desplazamiento de página en el modo tejer, ningún control mide menos de 44 × 44 px y no hay errores en consola.

## Fuera de este encargo

Importar imagen. No lo empieces.
