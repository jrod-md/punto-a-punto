# Punto a punto

Herramienta local de tapestry crochet. El nombre es provisional. Incluye proyectos, cálculo de tamaño a partir de una muestra y editor de cuadrícula. Los datos se guardan en IndexedDB del navegador; un archivo JSON es el respaldo para otro navegador o dispositivo. No usa servicios externos ni envía datos del tejido a servidores.

## Ejecutar

Necesitas Node.js 22.12 en la rama 22, Node.js 24 o superior compatible con Vitest, y npm. Se validó con Node.js 24.12.

```powershell
npm ci
npm run dev
```

Abre la dirección local indicada por Vite. En el primer inicio se crean los dos perfiles aproximados. Un proyecto de 40 × 40 cm con aguja de 4 mm tiene 64 puntos × 72 filas. Conserva la misma dirección y puerto para volver a los mismos datos: cada origen del navegador tiene su propia base local.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

La compilación queda en `dist/`. `npm test` ejecuta Vitest una sola vez, sin modo de espera.

## Usar el editor

Un dedo pinta, borra, rellena o selecciona. Dos dedos desplazan y amplían; cuando entra el segundo dedo se cancela la pintura provisional. En PC, usa la rueda para ampliar y el botón central o espacio con arrastre para desplazar. También hay botones para ampliar, alejar y ver toda la cuadrícula.

Cada trazo es un paso de deshacer. Se conservan hasta 100 pasos mientras el editor está abierto. Para mover una selección, arrastra dentro de su rectángulo. Centrar muestra los márgenes y avisa si sobra un punto o una fila. En «Medidas y nombre» puedes cambiar el tamaño: el diseño se conserva y se desplaza si cabe; recortarlo exige confirmación. El guardado es automático y avisa si falla.

## Convenciones

- `GaugeProfile` y `Project` incluyen `id` para relacionar los datos. La paleta admite de 1 a 12 colores.
- `cells` es una lista de índices de la paleta, de izquierda a derecha y desde la fila de abajo. Las funciones de cuadrícula usan coordenadas desde cero; las filas del patrón y el progreso empiezan en uno.
- Las operaciones devuelven nuevos datos. `centerDesign` y `moveDesign` admiten una cuadrícula de destino opcional para comprobar si el diseño cabe; si no cabe, devuelven el original y un aviso sin recortar celdas. Sin diseño, los márgenes son `null`.
- `carryAlways` lleva solo los colores que aparecen en alguna celda del proyecto. Los colores sin usar siempre dan 0 m, sin colas. El redondeo a una décima elimina únicamente el ruido de coma flotante próximo a un entero.
- El hilo se devuelve como estimación: centímetros con colas y margen, metros redondeados hacia arriba a un decimal y, si se conocen los metros por ovillo, cantidad entera de ovillos redondeada hacia arriba desde el consumo sin redondear.
- Los perfiles de fábrica se copian para editarlos. Su calibración representa 100 puntos a 2,6 o 3,8 cm por punto; son estimaciones, no muestras de la usuaria.
- Los valores negativos, no finitos, divisores nulos y cuadrículas mal formadas producen errores en español. Un tamaño objetivo de cero se limita a una celda, como indica la fórmula.
- IndexedDB guarda las celdas como `Uint8Array` (un byte por celda). La interfaz usa repositorios con `list`, `get`, `save` y `remove`; las importaciones de proyecto y perfil se escriben en una transacción conjunta.
- El respaldo JSON de versión 1 incluye el proyecto completo, la fecha de última edición y su perfil. Una importación idéntica conserva todos los campos; reemplazar un proyecto distinto requiere confirmación. Un perfil con el mismo identificador y otros valores se rechaza para proteger los proyectos existentes.
- El editor admite de 1 a 1000 puntos y de 1 a 1000 filas; los respaldos se limitan a 16 MB para acotar el uso de memoria. Las numeraciones se espacian al alejar la vista y muestran cada celda al acercarla.
- Mover una selección incluye su fondo y reemplaza las celdas de destino; puede deshacerse. Al reducir medidas, el diseño se desplaza lo mínimo para caber. Duplicar conserva los datos y asigna otro identificador, nombre y fecha.

## Comprobaciones en navegador

Con Vite abierto, visita las siguientes rutas locales y pulsa «Ejecutar comprobaciones»:

- `/scripts/storage-check.html`: IndexedDB real en una base aislada, respaldo idéntico, errores y limpieza de los datos de prueba.
- `/scripts/canvas-check.html`: trazo, gestos sintéticos y tiempos del canvas de 200 × 200. No sustituye una prueba en un teléfono físico.
- `/scripts/save-failure-check.html`: abre el proyecto de ejemplo y añade un color. El primer guardado falla a propósito y muestra el aviso; la siguiente edición permite recuperarse. No usa la base de la aplicación.

Estas páginas son herramientas de validación para desarrollo y no se incluyen en la compilación de la aplicación. Editor de perfiles, panel de hilo, patrón escrito, PDF, modo tejer, importación de imagen y PWA corresponden a otros encargos.

Vite, React, TypeScript, Vitest y ESLint implementan las herramientas solicitadas; los paquetes de tipos y complementos incluidos permiten usarlas juntas. No se agregan bibliotecas de producto.
