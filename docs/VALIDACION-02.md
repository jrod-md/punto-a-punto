# Validación del encargo 2

Se conservaron los contenidos de `AGENTS.md`, `docs/SPEC.md` y los encargos. La actualización de la regla de `carryAlways` y el encargo 2 estaban presentes antes de empezar.

## Regresiones de hilo

Antes de corregir `yarn.ts`, la prueba de color sin usar obtuvo 8 puntos llevados en lugar de 0. La prueba con 270 cm medidos para 133 puntos y margen del 10 % obtuvo 3,4 m en lugar de 3,3 m: la operación intermedia producía `330.0000000000001` cm. Las dos pruebas fallaron juntas antes de la corrección y ahora pasan. Otra prueba conserva el redondeo hacia arriba para un exceso real de consumo.

## Navegador

- A 360 × 800: proyecto de 40 × 40 cm con perfil de 4 mm, 64 puntos × 72 filas, pintura, un solo paso por trazo, deshacer y rehacer. Se compararon capturas del canvas para comprobar que rehacer restituía el mismo dibujo visible.
- Centrado del dibujo de prueba: 29 puntos a la izquierda, 30 a la derecha, 34 filas abajo y 35 arriba; avisos de centrado no exacto. Se cerró la pestaña y se abrió otra en el mismo origen; el dibujo permaneció guardado.
- Exportación real a archivo JSON e importación desde el selector de archivos. Un archivo de versión incompatible mostró un error en español y conservó los proyectos. La importación válida mostró su mensaje de éxito.
- Duplicación, selección rectangular y movimiento, relleno, borrado y deshacer. Paleta de 12 colores con el botón de añadir deshabilitado; renombrado y cambio de tono comprobado tras reabrir. El fondo no ofrece borrado.
- Mediciones de botones, entradas, selectores y desplegables: ningún control visible menor de 44 × 44 px. Sin desbordamiento horizontal a 360 px.
- Proyecto real de 200 × 200 creado desde puntos y filas: tamaño resultante 125 × 111,11 cm, pintura y ampliación mediante rueda.
- Guardado fallido simulado detrás de la interfaz de repositorio: aviso visible en español, dibujo retenido y recuperación al siguiente guardado correcto.

## Comprobaciones reproducibles

`scripts/storage-check.html` ejecutó 10 comprobaciones correctas y 0 fallidas sobre IndexedDB real en una base aislada. Comprobó perfiles de fábrica sin duplicación, operaciones del repositorio, `Uint8Array` con un byte por celda, respaldo idéntico, rechazo de archivos y perfiles en conflicto, ausencia de escrituras parciales y propagación de errores de guardado. Eliminó su base de prueba al terminar.

`scripts/canvas-check.html` ejecutó 8 comprobaciones correctas y 0 fallidas. En 120 movimientos de un trazo no hubo lecturas de las celdas del proyecto ni confirmaciones intermedias; el final produjo una sola operación. Los gestos sintéticos de dos dedos, botón central, rueda y cancelación conservaron el contenido del proyecto.

La medición registrada en este equipo fue de 0,10 ms como máximo por `drawImage` y 5,60 ms de mediana por fotograma del gesto de prueba. Estas cifras corresponden al navegador integrado en el equipo de desarrollo, a eventos sintéticos y a esa ejecución; no demuestran rendimiento en un teléfono físico ni representan una garantía para otro dispositivo.

## Decisiones de implementación

- Sin dependencias nuevas. React gestiona las pantallas; IndexedDB y Canvas usan APIs del navegador fuera de `src/core/`.
- Raster de un píxel por celda, ampliado sin suavizado, y dibujo limitado a las líneas visibles. Durante el trazo se actualiza esa previsualización y un conjunto de índices; la cuadrícula se valida y copia al confirmar el trazo.
- Historial de 100 operaciones en la sesión del editor. Los proyectos se guardan; el historial y la vista no se persisten.
- Tamaño máximo de 1000 × 1000 y respaldo de hasta 16 MB para limitar recursos. Numeración adaptativa para evitar superposición al alejar la vista.
- El JSON incluye el perfil para que el respaldo conserve la proporción y las medidas. Un conflicto de perfil se rechaza; reemplazar otro proyecto requiere confirmación.
- La selección incluye celdas de fondo; moverla reemplaza el destino. Reducir medidas desplaza el diseño lo mínimo si cabe; si no cabe, requiere confirmación y el recorte se puede deshacer.
- Las confirmaciones usan cuadros propios en español con foco inicial en «Cancelar», cierre con Escape y recorrido de foco acotado. La confirmación nativa de una versión anterior bloqueó la automatización durante la prueba y motivó esta sustitución.

No se implementaron los elementos excluidos del encargo: creación y calibración de perfiles, panel de hilo, pantalla de patrón, PDF, modo tejer, importación de imágenes y PWA.

## Resultado final de comandos

- `npm run typecheck`: correcto, sin errores.
- `npm run lint`: correcto, sin errores ni advertencias.
- `npm test`: 133 pruebas correctas en 9 archivos.
- `npm run build`: correcto, 42 módulos transformados y salida en `dist/`.

La comprobación interactiva final de los cuadros propios de confirmación quedó pendiente: el diálogo nativo anterior bloqueó los clics del navegador integrado y sus APIs de Escape, cierre y lectura de diálogo. Se solicitó cerrar ese diálogo con «Cancelar» para continuar. Las pruebas puras de recorte, conservación y deshacer sí pasaron. Tampoco se probó en un teléfono físico.
