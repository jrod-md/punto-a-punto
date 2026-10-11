# Especificación — herramienta de tapestry crochet

Fuente de verdad del producto. Si algo del código contradice este documento, gana este documento; si este documento está mal, se corrige aquí primero.

## 1. Para quién y para qué

Usuaria principal: una tejedora diestra que hace tapestry crochet (punto bajo normal, con el hilo que no se usa llevado escondido dentro de los puntos toda la fila). Teje en plano y en redondo (espiral continua). Hace mantas de bebé, cojines, blusas y tops con diseños tipo pixel art. Usa la app sobre todo en el celular, también en PC y tablet. No imprime.

Problema que resuelve, en orden de importancia:

1. **Tamaño:** saber cuántos puntos y filas necesita para que la pieza mida lo que quiere con su hilo y su aguja, sin ensayo y error.
2. **Centrado:** saber dónde cae el diseño dentro de la pieza y en qué punto está la mitad.
3. **Hilo:** saber cuántos metros de cada color va a gastar antes de comprar.
4. **Seguir el patrón:** no perderse de fila ni de punto mientras teje.

La interfaz debe entenderla alguien que no usa apps de diseño. Todo el texto visible va en español.

## 2. Fuera de alcance

- Patrones de símbolos de crochet.
- Piezas con volumen (amigurumi) y moldes de ropa. Una prenda se trata como paneles rectangulares.
- Cuentas de usuario, servidor, sincronización entre dispositivos.

## 3. Conceptos

### 3.1 Perfil de muestra

Guarda cómo teje ella con una combinación de hilo y aguja. Todo lo demás se calcula a partir de aquí.

| Campo | Significado |
|---|---|
| `name` | Nombre libre, por ejemplo "Algodón aguja 4" |
| `hookMm` | Aguja en mm (informativo) |
| `construction` | `flat` o `round`: cómo se tejió la muestra |
| `swatchStitches`, `swatchRows` | Puntos y filas de la muestra |
| `swatchWidthCm`, `swatchHeightCm` | Medidas de la muestra |
| `yarnMeasuredCm` | Largo de hilo medido para calibrar |
| `yarnMeasuredStitches` | Puntos que salieron con ese largo |
| `carriedFactor` | Factor del hilo llevado, por defecto 1.1 |
| `metersPerBall` | Opcional, para mostrar ovillos |
| `approximate` | `true` en los perfiles de fábrica |

Calibración sin báscula (es el método principal, ella no usa báscula):

1. Tejer una muestra de al menos 15 × 15 puntos y medir ancho y alto.
2. Medir 2 m de hilo desde la aguja y poner una marca (un clip o un nudo flojo). Tejer punto bajo hasta llegar a la marca y contar los puntos.

Perfiles de fábrica, marcados como aproximados y editables, para poder usar la app antes de calibrar:

| Nombre | Puntos × filas en 10 cm | Hilo por punto |
|---|---|---|
| Aguja 3 mm (aproximado) | 22 × 24 | 2.6 cm |
| Aguja 4 mm (aproximado) | 16 × 18 | 3.8 cm |

Estos valores son estimaciones generales, no medidas de ella. La app debe invitar a reemplazarlos con una muestra propia.

### 3.2 Proyecto

| Campo | Significado |
|---|---|
| `name` | Nombre |
| `profileId` | Perfil de muestra usado |
| `construction` | `flat` o `round` |
| `cols`, `rows` | Tamaño de la cuadrícula en puntos y filas |
| `palette` | Lista de colores `{ id, name, hex }`, máximo 12 |
| `backgroundColorId` | Color de fondo |
| `cells` | Índice de color por celda, fila 1 = fila de abajo |
| `carryAlways` | Si lleva el hilo también en filas de un solo color, por defecto `false` |
| `marginPercent` | Margen de seguridad del hilo, por defecto 10 |
| `progress` | `{ row, stitch }` del modo tejer |
| `tapStep` | Puntos que avanza cada toque, por defecto 5 |

### 3.3 Diseño y fondo

No hay capas. El "diseño" es el conjunto de celdas que no son del color de fondo. Centrar el diseño significa mover ese conjunto para que su rectángulo envolvente quede en el centro de la cuadrícula.

## 4. Fórmulas

Todas viven en funciones puras con pruebas.

**Medidas del punto**

```
stitchWidthCm = swatchWidthCm / swatchStitches
rowHeightCm   = swatchHeightCm / swatchRows
```

**De centímetros a cuadrícula**

```
cols = max(1, round(targetWidthCm / stitchWidthCm))
rows = max(1, round(targetHeightCm / rowHeightCm))
realWidthCm  = cols * stitchWidthCm
realHeightCm = rows * rowHeightCm
```

Siempre se muestra el tamaño real resultante, no solo el pedido.

**Centrado**

Sea `bbox` el rectángulo envolvente del diseño, de ancho `w` y alto `h`.

```
left   = floor((cols - w) / 2)
bottom = floor((rows - h) / 2)
```

La app informa los puntos de fondo a izquierda y derecha y las filas de fondo abajo y arriba. Si `cols - w` es impar, lo dice: el diseño no puede quedar exactamente centrado y sobra un punto a la derecha. Si el diseño no cabe, no se mueve y se avisa.

**Hilo por color**

```
yarnPerStitchCm    = yarnMeasuredCm / yarnMeasuredStitches
carriedPerStitchCm = stitchWidthCm * carriedFactor
```

Para cada fila y cada color `c`:

- `worked(c, fila)` = celdas de la fila con color `c`.
- Un color se lleva en una fila si aparece en esa fila y la fila tiene dos o más colores. Con `carryAlways`, todos los colores del proyecto distintos del que se teje se llevan en todas las filas.
- `carried(c, fila)` = `cols - worked(c, fila)` si el color se lleva en esa fila; si no, 0.

```
totalCm(c) = (Σ worked * yarnPerStitchCm + Σ carried * carriedPerStitchCm + 30) * (1 + marginPercent / 100)
```

Los 30 cm son las colas de inicio y remate. La cadeneta base y las cadenetas de giro no se modelan; las cubre el margen. El resultado se muestra en metros con un decimal, redondeado hacia arriba, y en ovillos si el perfil tiene `metersPerBall`. La interfaz lo presenta como estimación, nunca como cifra exacta.

**Patrón escrito**

La fila 1 es la de abajo. Tejedora diestra:

- `flat`: filas impares se leen de derecha a izquierda, pares de izquierda a derecha.
- `round`: todas las vueltas de derecha a izquierda. Se usa la palabra "Vuelta" en vez de "Fila".

Cada fila se escribe como tramos de color consecutivos en el orden de lectura, con el total al final:

```
Fila 1 (← derecha a izquierda): 12 A, 3 B, 12 A — 27 puntos
```

Las letras salen del orden de la paleta y el patrón incluye la leyenda letra → nombre de color.

## 5. Pantallas

1. **Proyectos:** lista, crear, duplicar, borrar, exportar e importar un proyecto como archivo JSON (es el único respaldo).
2. **Nuevo proyecto:** elegir perfil, plano o redondo, y el tamaño en centímetros o directamente en puntos. Muestra los puntos, las filas y el tamaño real.
3. **Editor:** cuadrícula con celdas en la proporción real del punto, numeración de filas a ambos lados y de columnas arriba y abajo, líneas de centro que se pueden mostrar u ocultar, línea más gruesa cada 5 y cada 10. Herramientas: pintar, borrar, rellenar, seleccionar y mover, centrar diseño, deshacer y rehacer, zoom y desplazamiento con dos dedos. Panel de hilo por color que se actualiza al pintar.
4. **Perfiles de muestra:** lista y asistente de calibración paso a paso.
5. **Patrón:** texto fila por fila, leyenda, lista de hilo, y exportación a PDF y a imagen de la cuadrícula.
6. **Modo tejer:** fila actual resaltada y el resto atenuado, sentido de lectura indicado, toque grande que avanza `tapStep` puntos, botón de un punto, deshacer el último avance, pasar de fila. El progreso se guarda solo. La pantalla no se apaga mientras está abierto.
7. **Importar imagen:** recortar, elegir tamaño y número de colores, y llevar el resultado al editor para retocar.

## 6. Decisiones técnicas

- Vite, React y TypeScript estricto. Vitest para pruebas.
- Aplicación web instalable (PWA) que funciona sin conexión. Sin servidor.
- Datos en IndexedDB.
- Dibujo de la cuadrícula en `<canvas>`, para que una manta de 200 × 200 se mueva con fluidez en un celular.
- Diseño pensado primero para pantalla de celular y toque; zonas de toque de al menos 44 px.
- La lógica de la sección 4 vive en `src/core/`, sin dependencias de React ni del navegador.

## 7. Fases

| Fase | Contenido | Encargo |
|---|---|---|
| 1 | Proyecto base, modelo de datos y toda la lógica de la sección 4 con pruebas | `docs/encargos/01-base.md` |
| 2 | Proyectos, nuevo proyecto y editor | pendiente |
| 3 | Perfiles de muestra, calibración y panel de hilo | pendiente |
| 4 | Patrón escrito y exportación | pendiente |
| 5 | Modo tejer | pendiente |
| 6 | Importar imagen, instalación sin conexión y pulido | pendiente |

## 8. Supuestos por confirmar con la usuaria

- "3 y 4" se interpretó como agujas de 3 mm y 4 mm. Podría ser grosor de hilo 3 y 4.
- En redondo teje en espiral continua.
- En filas de un solo color no lleva el otro hilo (`carryAlways` apagado por defecto).
