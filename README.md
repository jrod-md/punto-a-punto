# Punto a punto

Herramienta local de tapestry crochet. El nombre es provisional. Incluye proyectos, editor de cuadrícula, calibración de muestras sin báscula y estimación de hilo por color. Los datos se guardan en IndexedDB del navegador; un archivo JSON es el respaldo para otro navegador o dispositivo. No usa servicios externos ni envía datos del tejido a servidores.

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

## Abrir desde un celular por wifi

1. Conecta el PC y el celular al mismo wifi.
2. En PowerShell, desde esta carpeta, ejecuta `npm run dev:phone`. Mantén esa terminal abierta. Para elegir un puerto fijo puedes usar `npm run dev:phone -- --port 5188 --strictPort`.
3. Copia la dirección que Vite muestra como `Network` para la conexión wifi del PC y ábrela en el navegador del celular. Por ejemplo, si muestra `http://192.168.1.20:5173/`, abre esa dirección completa. `localhost` y `127.0.0.1` en el celular apuntan al propio celular, no al PC. Si hay varias direcciones, `ipconfig` muestra la dirección IPv4 del adaptador wifi.
4. Si no abre, comprueba que ambos equipos están en la misma red y que el router no aísla a sus clientes. Si Windows pide permitir Node.js, el acceso necesario es a la red privada de ese wifi. No hace falta desactivar el firewall.

El servidor de desarrollo entrega los archivos de la aplicación; el tejido se guarda en el navegador del celular. Los datos del PC no aparecen automáticamente: exporta e importa un JSON para llevar un proyecto al celular. Conserva la misma dirección y puerto para volver a los mismos datos. Termina el servidor con `Ctrl+C` cuando acabes.

## Usar el editor

Un dedo pinta, borra, rellena o selecciona. Dos dedos desplazan y amplían; cuando entra el segundo dedo se cancela la pintura provisional. En PC, usa la rueda para ampliar y el botón central o espacio con arrastre para desplazar. También hay botones para ampliar, alejar y ver toda la cuadrícula.

El editor ocupa el alto visible. La paleta y la barra de herramientas están siempre abajo, al alcance del pulgar; la cuadrícula ocupa el espacio restante. Una cuadrícula de 64 × 72 se abre completa a 375 px de ancho. Cuando la vista completa da celdas de menos de 3 px en alguna dimensión, se abre ampliada desde la fila 1 y centrada horizontalmente. «Ver completa» permite ver cualquier proyecto entero. Girar o redimensionar reajusta la vista completa o conserva el punto del dibujo que estaba en el centro de la vista ampliada.

Cada trazo es un paso de deshacer. Se conservan hasta 100 pasos mientras el editor está abierto. Para mover una selección, arrastra dentro de su rectángulo. Centrar muestra los márgenes sobre la cuadrícula sin moverla. «Ajustes» abre y cierra el panel de nombre, muestra, medidas, colores y respaldo. Cambiar el tamaño conserva y desplaza el diseño si cabe; recortarlo exige confirmación. El guardado es automático y avisa si falla.

## Calibrar una muestra y estimar el hilo

Desde «Mis muestras», crea, edita o duplica una muestra. El asistente pregunta por el hilo y la aguja, los puntos y medidas de la muestra y los puntos obtenidos con el largo de hilo marcado. Comienza con 2 m; puedes cambiar ese largo. Una muestra menor de 15 puntos o 15 filas muestra un aviso y permite continuar. El último paso resume los puntos y filas en 10 cm, el hilo por punto y una pieza de 40 × 40 cm. Los metros por ovillo son opcionales y se pueden añadir después editando la muestra.

No se puede borrar una muestra que use algún proyecto: el aviso enumera cuáles. Editar una muestra usada recalcula las medidas y el hilo de esos proyectos. Cambiar la muestra desde «Ajustes» también conserva los puntos, las filas y las celdas del dibujo.

«Hilo» abre la estimación para los colores usados, el total y los ovillos cuando se conoce su metraje. Usa las fórmulas de `src/core/yarn.ts`. El cálculo se hace sobre el trazo confirmado, nunca sobre sus movimientos intermedios. El total suma los metros mostrados por color, ya redondeados hacia arriba. Puedes aplicar otro margen o llevar los colores usados en todas las filas. Los perfiles aproximados lo advierten y ofrecen ir a calibrar.

## Convenciones

- `GaugeProfile` y `Project` incluyen `id` para relacionar los datos. La paleta admite de 1 a 12 colores.
- `cells` es una lista de índices de la paleta, de izquierda a derecha y desde la fila de abajo. Las funciones de cuadrícula usan coordenadas desde cero; las filas del patrón y el progreso empiezan en uno.
- Las operaciones devuelven nuevos datos. `centerDesign` y `moveDesign` admiten una cuadrícula de destino opcional para comprobar si el diseño cabe; si no cabe, devuelven el original y un aviso sin recortar celdas. Sin diseño, los márgenes son `null`.
- `carryAlways` lleva solo los colores que aparecen en alguna celda del proyecto. Los colores sin usar siempre dan 0 m, sin colas. El redondeo a una décima elimina únicamente el ruido de coma flotante próximo a un entero.
- El hilo se devuelve como estimación: centímetros con colas y margen, metros redondeados hacia arriba a un decimal y, si se conocen los metros por ovillo, cantidad entera de ovillos redondeada hacia arriba desde el consumo sin redondear.
- Los perfiles de fábrica son editables. Su calibración representa 100 puntos a 2,6 o 3,8 cm por punto; son estimaciones, no muestras de la usuaria. Renombrar o añadir ovillos conserva la marca de aproximado; introducir medidas de muestra o de hilo distintas la reemplaza por una muestra propia. Duplicar conserva esa marca.
- El asistente admite conteos enteros positivos y medidas desde 0,01. Límites para rechazar entradas imposibles: aguja 50 mm; 10000 puntos o filas de muestra; 1000 cm de ancho o alto; 10000 m de hilo medido; 1000000 puntos de calibración; 100000 m por ovillo. El factor de hilo llevado admite de 0 a 10 y el margen, de 0 a 1000 %.
- Los identificadores usan bytes de `crypto.getRandomValues`, compatible con el acceso por HTTP en la red local; no necesitan HTTPS ni una biblioteca nueva.
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

Estas páginas son herramientas de validación para desarrollo y no se incluyen en la compilación de la aplicación. Patrón escrito, PDF, modo tejer, importación de imagen y PWA corresponden a otros encargos.

Vite, React, TypeScript, Vitest y ESLint implementan las herramientas solicitadas; los paquetes de tipos y complementos incluidos permiten usarlas juntas. No se agregan bibliotecas de producto.
