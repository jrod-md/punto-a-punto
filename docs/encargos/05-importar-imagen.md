# Encargo 5 — Importar una imagen de pixel art

Lee primero `AGENTS.md` y `docs/SPEC.md`. Rama: `encargo-05-importar-imagen`.

## Por qué

Es lo primero que la usuaria esperaba encontrar: abrir la imagen de un pixel art que ya tiene (una captura de un patrón, un dibujo descargado) y que la app lo convierta en su cuadrícula, ajustado a la medida de la pieza que quiere tejer. Hoy tiene que redibujarlo cuadro por cuadro.

## Parte A — De imagen a cuadrícula

Flujo en pasos cortos, una decisión por pantalla, usable con el pulgar:

1. **Elegir imagen** desde la galería o los archivos. Todo se procesa en el dispositivo; la imagen no se envía a ningún sitio. Las imágenes grandes se reducen antes de procesar para no bloquear el teléfono.
2. **Recortar** la zona del dibujo, para dejar fuera números, márgenes y texto de la captura.
3. **Cuadros.** La app detecta cuántos cuadros de ancho y de alto tiene el dibujo y los muestra como una rejilla superpuesta a la imagen. La usuaria puede corregir los dos números y ve la rejilla moverse en vivo hasta que coincide con los cuadros. Debe funcionar con:
   - pixel art limpio, donde cada cuadro es un bloque de píxeles iguales;
   - capturas de patrones con líneas de cuadrícula entre los cuadros, como las de un gráfico de crochet;
   - imágenes comprimidas (JPEG) con bordes algo sucios.
   El color de cada cuadro se toma de su zona central, para que las líneas de cuadrícula y los bordes no lo contaminen.
4. **Colores.** La app propone el menor número de colores que representa bien el dibujo. La usuaria puede cambiar cuántos colores (de 2 a 12) con vista previa en vivo, fusionar dos colores parecidos, renombrarlos y elegir cuál es el fondo. Los píxeles transparentes cuentan como fondo.
5. **Resultado.** Vista previa del dibujo en la proporción real del punto, con su tamaño en puntos y en centímetros según la muestra elegida.

Si la imagen no es pixel art (una foto, un dibujo con degradados), el paso 3 no encuentra cuadros: la app lo dice con claridad y deja elegir a mano cuántos puntos de ancho debe tener el resultado, avisando de que hará falta retocarlo.

## Parte B — Ajustarlo a la medida

Dos entradas:

- **Nuevo proyecto → "Desde una imagen".** Después de importar, la usuaria elige la medida de la pieza en centímetros (o puntos) y la muestra, como en un proyecto normal. El dibujo queda centrado sobre el fondo.
- **Editor → "Importar imagen".** Añade el dibujo al proyecto abierto, centrado, como un solo paso que se puede deshacer.

En ambos casos, antes de colocarlo:

- Se muestra cuánto ocupa el dibujo dentro de la pieza: puntos y centímetros del dibujo, y puntos de fondo que quedan a cada lado, arriba y abajo, con el mismo informe que usa "Centrar diseño".
- Se puede cambiar la escala del dibujo: ×1 (un cuadro = un punto), ×2, ×3, o "ajustar al ancho" con un margen elegido. Las escalas enteras conservan el dibujo exacto. "Ajustar al ancho" con una escala no entera avisa de que el dibujo puede perder detalle y muestra el resultado antes de aceptar.
- Si el dibujo no cabe en la pieza, se ofrecen las opciones que existan: agrandar la pieza al tamaño mínimo necesario (mostrando la nueva medida en centímetros) o reducir el dibujo. Nunca se recorta en silencio.
- Los colores importados se añaden a la paleta del proyecto. Si se supera el máximo de 12, se pide fusionar antes de continuar.

## Parte C — Patrón y modo tejer a la vista

"Ver patrón" y "Modo tejer" están hoy dentro del panel de Ajustes y no se encuentran. Sácalos a la barra superior del editor como acciones visibles, junto a "Hilo", sin quitarle espacio a la cuadrícula ni bajar ningún control de 44 × 44 px.

## Referencias: no reinventar

Esto ya se ha resuelto antes. Estudia estas referencias antes de escribir código y toma de ellas lo que se indica. Las dos primeras tienen licencia MIT; aun así, reimplementa las ideas en TypeScript en vez de copiar código o añadir sus dependencias (una usa OpenCV y la otra un núcleo en WebAssembly, demasiado peso para una app que debe abrir sin conexión en un teléfono). Si tras probar concluyes que una dependencia da resultados claramente mejores, detente y justifícalo en el informe antes de añadirla.

**Detección de cuadros — `KennethJAllen/proper-pixel-art` (Python, MIT)**

- Perfil de proyección: suma la magnitud del gradiente por columnas y por filas. Los picos caen en los bordes entre cuadros.
- El tamaño del cuadro sale del periodo de ese perfil (autocorrelación) o de la mediana de la distancia entre picos.
- Protección contra el error típico de detectar el doble del tamaño real: puntúa cada tamaño candidato por la variación de color dentro de cada cuadro y quédate con el que deja los cuadros más uniformes.
- Si faltan líneas, completa la malla subdividiendo los huecos de forma uniforme y ajusta cada línea al pico más cercano.
- Antes de todo: recorta bordes vacíos y trata como fondo los píxeles con transparencia mayor al 50 %.
- El color de cada cuadro es el más frecuente dentro del cuadro, no el promedio.
- Colores casi iguales se fusionan por distancia, para que una zona plana no salga con tres tonos.
- Su propia advertencia: el número de colores es el parámetro que más hay que ajustar, y siempre debe existir la corrección manual del tamaño del cuadro. Por eso los pasos 3 y 4 son editables.

**Cuadros de tamaño no entero — `jenissimo/unfake.js` (JavaScript y Rust, MIT)**

- Una captura reescalada puede tener cuadros de 10,24 px. La malla debe admitir tamaños fraccionarios y distinto desfase en cada eje; no asumas un número entero de píxeles por cuadro.
- Ofrece dos detectores, uno por tramos de color iguales y otro por bordes, y elige entre ellos. Si un solo método no supera las pruebas, combina los dos.

**Flujo de importación — Stitch Fiddle (herramienta comercial, solo como referencia de uso)**

- Sus pasos: elegir imagen, vista previa, girar, tamaño, proporción del punto, número de colores, y retocar después en el editor. Es un orden que las tejedoras ya conocen: respétalo.
- El tamaño se pide como "máximo de puntos del lado más largo" y el otro lado se ajusta solo. Usa esa misma idea en "ajustar al ancho".
- Añade un botón de girar 90° en el paso de recorte.
- Lo que hace distinto esta app y hay que cuidar: Stitch Fiddle remuestrea la imagen, así que un pixel art que ya tiene cuadros sale borroso; aquí se detectan los cuadros reales. Además, aquí el tamaño se elige en centímetros con la muestra de la usuaria y se informa del centrado.

**Proporción del punto — `crochetpatterngen-engine` (Python)**

- Ajusta las dimensiones de la cuadrícula para que la pieza tejida conserve las proporciones de la foto en vez de salir achatada. Aplícalo solo en el camino de "no es pixel art": al remuestrear una foto, calcula columnas y filas con `stitchWidthCm` y `rowHeightCm` para que el resultado tejido tenga la proporción de la imagen.
- En pixel art no se compensa (rompería los cuadros); se muestra la vista previa en proporción real y la medida en centímetros.
- Entrega el número de puntos por color, que suma exactamente el total de la cuadrícula. Añade esa cifra junto a los metros en el panel de hilo y en la pantalla de patrón.

## Lógica y pruebas

La detección de cuadros, el muestreo, la reducción de colores y el escalado van en funciones puras que trabajan sobre datos de píxeles, sin DOM, con pruebas que usen imágenes generadas en la propia prueba:

- Un dibujo de 20 × 24 cuadros en 3 colores, ampliado a 16 px por cuadro: se recupera idéntico, cuadro por cuadro.
- El mismo dibujo con líneas de cuadrícula de 1 px y de 2 px entre cuadros: idéntico.
- El mismo dibujo con ruido que imite la compresión JPEG: idéntico, y con 3 colores, no más.
- El mismo dibujo con un margen blanco irregular alrededor, tras recortar: idéntico.
- El mismo dibujo reescalado para que cada cuadro mida 10,24 px, con un desfase distinto en cada eje: idéntico.
- Un dibujo con una zona grande de un solo color y pocos bordes: el tamaño del cuadro no se detecta al doble.
- Una foto de 400 × 300 px con una muestra de 0,625 × 0,556 cm por punto y 60 puntos de ancho: el resultado tiene las filas necesarias para conservar la proporción 4:3 al tejerse.
- Los puntos por color suman `cols × rows`.
- Una imagen con degradado suave: se informa como "no es pixel art".
- Escala ×2: cada cuadro pasa a ser un bloque de 2 × 2 exacto.
- Un dibujo de 30 de ancho en una pieza de 20: no se coloca y se devuelven las opciones.

## Criterios de aceptación

- Los cinco comandos (`typecheck`, `lint`, `format:check`, `test`, `build`) terminan en verde.
- Con una captura real de un patrón de crochet con cuadrícula y números en los bordes (usa una imagen libre o genera una equivalente; no subas imágenes ajenas al repositorio), el recorrido completo a 375 × 812 termina con el dibujo correcto, centrado en una pieza de 40 × 40 cm, sin retocar a mano más de unos pocos cuadros. Documenta cuántos.
- Importar una imagen de 4000 × 4000 px no congela la interfaz más de un instante y muestra progreso.
- Importar en un proyecto existente se deshace con un solo "Deshacer".
- "Ver patrón" y "Modo tejer" se ven en el editor sin abrir ningún panel.
- Sin desplazamiento horizontal, sin controles menores de 44 × 44 px y sin errores en consola.
- Verificado también en la vista previa de Cloudflare de la rama.

## Fuera de este encargo

Proyectos de ejemplo y rediseño visual general. No los empieces.
