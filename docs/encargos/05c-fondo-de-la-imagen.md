# Encargo 5c — Fondo de la imagen importada

Lee primero `AGENTS.md`. Trabaja en la misma rama `encargo-05-importar-imagen` y sube los commits al PR 2 existente.

## Qué pasa

La detección de cuadros ya lee bien las dos capturas reales de la usuaria (gato: 36 × 36 con cuadros de 5,6 × 8,1 px; polilla: 55 × 29). El recorrido completo con el gato, sin tocar ninguna opción, termina mal:

- La pieza de 64 × 72 queda rellena de negro.
- El gato aparece dentro de un rectángulo blanco de 36 × 36.
- El informe dice "Dibujo: 36 × 36, exactamente centrado", porque toma el rectángulo blanco como parte del dibujo.

Causa: el fondo se elige por defecto como el color más frecuente. En un dibujo donde la figura ocupa más que el fondo (un gato negro sobre blanco), eso elige la figura.

## Lo que se pide

1. **Fondo por el borde.** El fondo propuesto es el color más frecuente en el contorno del dibujo recortado (las celdas de la primera y la última fila y columna), no el más frecuente del total. Si el contorno no decide con claridad, se usa el color de las esquinas; si tampoco, se pregunta.
2. **Que el error se vea.** En el paso de colores, la vista previa muestra el dibujo colocado sobre una pieza más grande rellena con el fondo elegido. Así, un fondo equivocado salta a la vista antes de continuar. Cambiar el fondo actualiza la vista al momento.
3. **Medidas del dibujo sin fondo.** El tamaño del dibujo y el informe de centrado usan el rectángulo envolvente de las celdas que no son fondo, igual que "Centrar diseño" en el editor.
4. **Nombres de color.** En vez de "Color 1" y "Color 2", propone un nombre por el tono: Negro, Blanco, Gris, Rojo, Naranja, Amarillo, Verde, Azul, Morado, Rosa, Marrón, Beige, con "claro" u "oscuro" cuando haya dos del mismo tono. Siguen siendo editables.
5. **Recorte sin jerga.** En el paso de recorte, los cuatro campos en píxeles pasan a una sección plegada "Ajuste fino". Lo principal es arrastrar las esquinas.

## Pruebas nuevas

- Figura oscura que ocupa el 70 % de un dibujo con contorno claro: el fondo propuesto es el claro.
- Figura clara sobre fondo oscuro: el fondo propuesto es el oscuro.
- Dibujo que toca los cuatro bordes con dos colores a partes iguales en el contorno: no se propone fondo y se pregunta.
- Con el fondo correcto, un dibujo de 36 × 36 cuya figura ocupa 30 × 32 informa 30 × 32 y los márgenes correspondientes.
- Los nombres propuestos para `#222222`, `#f4f4f4`, `#b44146` y `#2d4155` son Negro, Blanco, Rojo y Azul.

## Criterios de aceptación

- Los cinco comandos terminan en verde.
- A 375 × 812, importar una captura generada de una figura oscura grande sobre fondo claro, sin cambiar ninguna opción, termina con la pieza en el color claro y la figura centrada.
- No se añade nada fuera de estos cinco puntos.
