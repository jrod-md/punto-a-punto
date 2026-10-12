# Punto a punto

Herramienta local de tapestry crochet. El nombre es provisional. Incluye proyectos, editor de cuadrícula, calibración de muestras sin báscula, estimación de hilo, patrón escrito, exportación PNG/PDF y modo tejer. Es una aplicación web instalable que funciona sin conexión después de la primera visita. Los datos se guardan en IndexedDB del navegador; un archivo JSON es el respaldo para otro navegador o dispositivo. No usa servicios externos ni envía datos del tejido a servidores.

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
npm run format:check
npm test
npm run build
```

La compilación queda en `dist/`. `npm test` ejecuta Vitest una sola vez, sin modo de espera. Para probar el build, el service worker y el funcionamiento desde la raíz:

```powershell
npm run preview
```

En Cloudflare Pages, usa `npm run build`, directorio de salida `dist` y la raíz del dominio. La PWA necesita HTTPS en producción; el origen local del PC también permite comprobarla. No hace falta un backend.

## Abrir desde un celular por wifi

1. Conecta el PC y el celular al mismo wifi.
2. En PowerShell, desde esta carpeta, ejecuta `npm run dev:phone`. Mantén esa terminal abierta. Para elegir un puerto fijo puedes usar `npm run dev:phone -- --port 5188 --strictPort`.
3. Copia la dirección que Vite muestra como `Network` para la conexión wifi del PC y ábrela completa en el navegador del celular. `localhost` en el celular apunta al propio celular, no al PC. Si hay varias direcciones, `ipconfig` muestra la dirección IPv4 del adaptador wifi.
4. Si no abre, comprueba que ambos equipos están en la misma red y que el router no aísla a sus clientes. Si Windows pide permitir Node.js, el acceso necesario es a la red privada de ese wifi. No hace falta desactivar el firewall.

El servidor de desarrollo entrega los archivos de la aplicación; el tejido se guarda en el navegador del celular. Los datos del PC no aparecen automáticamente: exporta e importa un JSON para llevar un proyecto al celular. Conserva la misma dirección y puerto para volver a los mismos datos. Termina el servidor con `Ctrl+C` cuando acabes.

La conexión HTTP por wifi sirve para revisar el editor. Para instalar en iPhone y comprobar la PWA, usa el enlace HTTPS publicado.

## Usar el editor

Un dedo pinta, borra, rellena o selecciona. Dos dedos desplazan y amplían; cuando entra el segundo dedo se cancela la pintura provisional. En PC, usa la rueda para ampliar y el botón central o espacio con arrastre para desplazar. También hay botones para ampliar, alejar y ver toda la cuadrícula.

El editor ocupa el alto visible. La paleta y la barra de herramientas están siempre abajo, al alcance del pulgar; la cuadrícula ocupa el espacio restante. Una cuadrícula de 64 × 72 se abre completa a 375 px de ancho. Cuando la vista completa da celdas de menos de 3 px en alguna dimensión, se abre ampliada desde la fila 1 y centrada horizontalmente. «Ver completa» permite ver cualquier proyecto entero. Girar o redimensionar reajusta la vista completa o conserva el punto del dibujo que estaba en el centro de la vista ampliada.

Cada trazo es un paso de deshacer. Se conservan hasta 100 pasos mientras el editor está abierto. Para mover una selección, arrastra dentro de su rectángulo. Centrar muestra los márgenes sobre la cuadrícula sin moverla. «Ajustes» abre y cierra el panel de nombre, muestra, medidas, colores y respaldo. Cambiar el tamaño conserva y desplaza el diseño si cabe; recortarlo exige confirmación. El guardado es automático y avisa si falla.

## Calibrar una muestra y estimar el hilo

Desde «Mis muestras», crea, edita o duplica una muestra. El asistente pregunta por el hilo y la aguja, los puntos y medidas de la muestra y los puntos obtenidos con el largo de hilo marcado. Comienza con 2 m; puedes cambiar ese largo. Una muestra menor de 15 puntos o 15 filas muestra un aviso y permite continuar. El último paso resume los puntos y filas en 10 cm, el hilo por punto y una pieza de 40 × 40 cm. Los metros por ovillo son opcionales y se pueden añadir después editando la muestra.

No se puede borrar una muestra que use algún proyecto: el aviso enumera cuáles. Editar una muestra usada recalcula las medidas y el hilo de esos proyectos. Cambiar la muestra desde «Ajustes» también conserva los puntos, las filas y las celdas del dibujo.

«Hilo» abre la estimación para los colores usados, el total y los ovillos cuando se conoce su metraje. Usa las fórmulas de `src/core/yarn.ts`. El cálculo se hace sobre el trazo confirmado, nunca sobre sus movimientos intermedios. El total suma los metros mostrados por color, ya redondeados hacia arriba. Puedes aplicar otro margen o llevar los colores usados en todas las filas. Los perfiles aproximados lo advierten y ofrecen ir a calibrar.

## Importar una imagen

Al crear un proyecto, pulsa «Desde una imagen». En un proyecto abierto, usa «Ajustes → Importar imagen». El asistente permite recortar arrastrando dos esquinas, girar 90°, revisar la rejilla detectada, corregir sus columnas y filas y elegir de 2 a 12 colores. Las medidas de recorte quedan plegadas en «Ajuste fino». Los colores reciben nombres por su tono y puedes fusionarlos, renombrarlos y elegir el fondo.

El fondo se propone por el contorno del dibujo recortado. Si no está claro, se consultan las esquinas; si tampoco deciden, la app pregunta. En el paso de colores ves el dibujo sobre una pieza mayor rellena con el fondo elegido, y cambiarlo actualiza la vista al momento. Las medidas del dibujo y los márgenes usan solo las celdas que no son fondo.

En pixel art se recuperan los cuadros reales, cuadrados o rectangulares, y el color de su zona central, evitando las líneas y los bordes. El paso de cuadros muestra la imagen con su rejilla junto al dibujo que se está leyendo. Si no puede confirmar ambos ejes, pregunta los números; corregir uno vuelve a buscar el otro. Los cuadros de menos de unos 6 px muestran un aviso para usar la imagen original, pero permiten continuar. El camino de foto se usa cuando la imagen es claramente suave o cuando tú lo eliges: indicas el ancho en puntos y la muestra determina las filas para conservar la proporción al tejer. Ese resultado necesitará retoques. La vista previa muestra la proporción física del punto y las medidas en centímetros.

Antes de colocarlo, elige la pieza y la escala ×1, ×2, ×3 o «Ajustar al ancho» con margen. La app informa los puntos de fondo en cada lado. Si no cabe, ofrece agrandar la pieza o reducir el dibujo; las escalas no enteras avisan de la pérdida de detalle. Una paleta combinada de más de 12 colores requiere fusionar antes de continuar. En el editor, el dibujo se añade centrado sobre el existente y toda la importación se deshace en un solo paso.

Las imágenes se procesan en un worker del dispositivo y se reducen a un máximo de 1600 píxeles por lado antes del análisis. El archivo original no se guarda en el proyecto ni se sube. La importación funciona sin conexión tras preparar la PWA. La [validación del encargo 5](docs/VALIDACION-05.md) incluye la captura generada, el centrado y los resultados locales y de Cloudflare.

## Llevarse el patrón y seguir el tejido

En la barra superior del editor, pulsa «Ver patrón». Muestra las medidas, la muestra usada, la leyenda y la misma estimación de hilo del editor, con los puntos por color junto a los metros. Cada fila tiene su línea, con la fila 1 primero. En plano, las filas impares se leen de derecha a izquierda y las pares al revés; en redondo, todas las vueltas se leen de derecha a izquierda.

Puedes copiar el texto completo, descargar un PNG numerado con leyenda o descargar un PDF con medidas, leyenda, hilo, cuadrícula y texto. El PDF conserva la proporción de la muestra y divide la cuadrícula en páginas con celdas de al menos 2,4 mm en ambas dimensiones; cada página repite la numeración y señala sus rangos. Con la muestra de 4 mm, 64 × 72 cabe en una página de cuadrícula y 200 × 200 ocupa 12. El resto de páginas contiene el encabezado y las instrucciones.

«Modo tejer» se abre desde la barra superior del editor o «Tejer» en la lista de proyectos. La fila actual aparece resaltada; los puntos hechos tienen una marca verde y los pendientes conservan el color original. Un dedo desplaza la cuadrícula, dos dedos desplazan y amplían. El botón grande avanza 1, 5, 10 puntos o el tramo del color actual. El paso inicial es 5 y tu elección se guarda.

El avance se detiene al final de la fila. El siguiente toque pide confirmar la siguiente. «Deshacer» después de cruzar vuelve al final de la fila anterior. También puedes avanzar un punto, terminar la fila, volver a la anterior o reiniciar con confirmación. El progreso se guarda automáticamente. El modo tejer pide mantener la pantalla encendida cuando el navegador lo permite; si no, sigue funcionando con normalidad.

## Instalar y conservar los diseños

En Safari de iPhone, abre el enlace HTTPS, pulsa Compartir y elige «Agregar a pantalla de inicio». La app ofrece una vez un aviso que explica este recorrido y se puede cerrar. El icono añadido abre Punto a punto a pantalla completa. En un navegador de escritorio compatible, usa su acción de instalar aplicación.

Después de la primera visita y la preparación de los archivos, vuelve a abrir la app sin conexión para comprobarlo. El PDF también funciona sin conexión. Las nuevas versiones se descargan en segundo plano y se aplican en la siguiente apertura; los proyectos y las muestras permanecen en IndexedDB. La instalación y la petición de almacenamiento persistente mejoran la conservación, pero no sustituyen el respaldo JSON.

La lista recuerda exportar cuando pasan más de 7 días sin respaldo. Editar un proyecto no reinicia ese plazo. Al exportar se registra la fecha de solicitud de descarga; el navegador no permite saber si finalmente conservaste el archivo. Importar un JSON también registra la fecha, porque ya existe ese respaldo. Guarda los archivos fuera del almacenamiento de la web.

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
- El respaldo JSON de versión 2 incluye el proyecto completo, la fecha de última edición, el progreso, el paso y su perfil. Se siguen aceptando los archivos de versión 1. Una importación idéntica conserva todos los campos; reemplazar un proyecto distinto requiere confirmación. Un perfil con el mismo identificador y otros valores se rechaza para proteger los proyectos existentes.
- `progress.stitch` es el próximo punto por tejer: 1 significa cero puntos hechos y `cols + 1`, fila completa. La interfaz muestra el último punto al completar la fila. `tapStep` admite números y `'color-run'`; la interfaz ofrece 1, 5, 10 y tramo de color. El progreso se limita a las dimensiones tras editar. El historial de deshacer conserva 100 avances durante la sesión; el progreso y el paso sí se guardan entre aperturas.
- La base local pasa de versión 1 a 2 sin reemplazar proyectos ni muestras. La nueva tabla `settings` guarda el aviso de instalación y las fechas del respaldo. Las cachés del service worker solo contienen archivos de la aplicación. Se conservan los archivos de versiones anteriores mientras otras ventanas puedan necesitarlos.
- El PNG limita la imagen a 4096 px por lado y unos 10 millones de píxeles de cuadrícula, dejando espacio para el encabezado y la leyenda. Se eligió ese límite por la [restricción de canvas en iOS documentada por MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#maximum_canvas_size). En proporciones extremas o nombres excesivamente largos que no permiten una imagen legible, la exportación explica la limitación en español; el diseño y el respaldo JSON se conservan.
- El editor admite de 1 a 1000 puntos y de 1 a 1000 filas; los respaldos se limitan a 16 MB para acotar el uso de memoria. Las numeraciones se espacian al alejar la vista y muestran cada celda al acercarla.
- Mover una selección incluye su fondo y reemplaza las celdas de destino; puede deshacerse. Al reducir medidas, el diseño se desplaza lo mínimo para caber. Duplicar conserva los datos y asigna otro identificador, nombre y fecha.

## Comprobaciones en navegador

Con Vite abierto, visita las siguientes rutas locales y pulsa «Ejecutar comprobaciones»:

- `/scripts/storage-check.html`: IndexedDB real en una base aislada, respaldo idéntico, errores y limpieza de los datos de prueba.
- `/scripts/canvas-check.html`: trazo, gestos sintéticos y tiempos del canvas de 200 × 200. No sustituye una prueba en un teléfono físico.
- `/scripts/export-check.html`: genera y abre PNG reales de 64 × 72, 200 × 200 y 1000 × 1000, comprobando resolución y el límite de 4096 px.
- `/scripts/save-failure-check.html`: abre el proyecto de ejemplo y añade un color. El primer guardado falla a propósito y muestra el aviso; la siguiente edición permite recuperarse. No usa la base de la aplicación.

Estas páginas son herramientas de validación para desarrollo y no se incluyen en la compilación de la aplicación. Los informes están en [docs/VALIDACION-04.md](docs/VALIDACION-04.md), [docs/VALIDACION-05.md](docs/VALIDACION-05.md), [docs/VALIDACION-05b.md](docs/VALIDACION-05b.md) y [docs/VALIDACION-05c.md](docs/VALIDACION-05c.md).

Vite, React, TypeScript, Vitest y ESLint implementan las herramientas solicitadas. Se añadió [jsPDF 4.2.1](https://github.com/parallax/jsPDF), la dependencia autorizada para generar el PDF localmente con cuadrícula vectorial y varias páginas. El módulo se importa solo al pulsar «Descargar PDF»; sus archivos se preparan en la caché para permitir esa acción sin conexión. Se incluyen las fuentes Noto Sans y Noto Sans Symbols para conservar los acentos y las flechas del patrón, con su licencia OFL en `src/assets/fonts/OFL.txt`. No se descargan fuentes ni datos del tejido desde servicios externos durante el uso.
