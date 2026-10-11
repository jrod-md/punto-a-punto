# Encargo 3 — Editor en celular, perfiles de muestra e hilo

Lee primero `AGENTS.md` y `docs/SPEC.md`.

## Objetivo

Que el editor sea cómodo en un celular de verdad, que la usuaria pueda calibrar su propia muestra sin báscula y que vea cuántos metros de cada color necesita mientras dibuja.

## Parte A — Editor en celular

Problemas encontrados al revisar la fase 2 a 375 × 812:

1. La cuadrícula empieza a 451 px del borde superior: las herramientas ocupan más de media pantalla y la paleta queda debajo de la cuadrícula, así que cambiar de color obliga a desplazar la página.
2. El proyecto se abre ampliado en la esquina superior izquierda (filas 72 a 55), lejos de la fila 1, que es por donde se empieza a tejer.
3. Los mensajes (por ejemplo, el informe de centrado) aparecen encima de la cuadrícula y la empujan hacia abajo; al desaparecer, la cuadrícula salta.
4. Las etiquetas de fila se superponen cuando la última fila queda junto a un múltiplo de 10 (se ve "72" encima de "70").
5. Al cambiar el tamaño de la ventana o girar el celular, la cuadrícula no se reajusta.

Lo que se pide:

- En celular, el editor ocupa exactamente el alto visible, sin desplazamiento de página. La cuadrícula recibe todo el espacio que sobra, al menos el 60 % del alto.
- Las herramientas van en una sola barra compacta y la paleta en una tira de colores siempre visible, ambas alcanzables con el pulgar. Editar colores, medidas, nombre y exportar pasan a un panel que se abre y se cierra.
- Un proyecto se abre en vista completa. Si a vista completa las celdas quedan demasiado pequeñas para tocarlas, se abre ampliado sobre la fila 1 y centrado en horizontal.
- Los mensajes se muestran sobrepuestos, sin mover la cuadrícula.
- Las etiquetas de numeración nunca se superponen.
- La cuadrícula se reajusta al girar el dispositivo y al cambiar el tamaño de la ventana, conservando lo que se estaba viendo.
- Añade el script `dev:phone`, que sirve la app en la red local, y explica en el README cómo abrirla desde un celular conectado al mismo wifi.

## Parte B — Perfiles de muestra

Pantalla 4 de la especificación.

- Lista de perfiles con nombre, aguja y si es aproximado. Crear, editar, duplicar y borrar. No se puede borrar un perfil que usa algún proyecto; el mensaje dice cuáles.
- Asistente de calibración en pasos cortos, una cosa por pantalla, con lenguaje de tejedora y sin jerga:
  1. Nombre, aguja y si la muestra se tejió en plano o en redondo.
  2. Cuántos puntos y cuántas filas tiene la muestra, y cuánto mide de ancho y de alto.
  3. Hilo: "Mide 2 m de hilo desde la aguja y pon una marca. Teje punto bajo hasta la marca. ¿Cuántos puntos salieron?". El largo medido se puede cambiar.
  4. Resumen: puntos y filas en 10 cm e hilo por punto, y una frase que diga qué significa ("una pieza de 40 × 40 cm serán X puntos × Y filas").
- Metros por ovillo es opcional y se puede añadir después.
- Validaciones con mensajes claros: valores vacíos, cero o imposibles, y un aviso (no un bloqueo) cuando la muestra tiene menos de 15 puntos o 15 filas.
- Cambiar el perfil de un proyecto desde su panel recalcula el tamaño real y el hilo sin tocar el dibujo, y lo explica.

## Parte C — Panel de hilo

- En el editor, un panel que se abre y se cierra con una fila por color usado: muestra del color, nombre, metros y, si el perfil tiene metros por ovillo, ovillos.
- Se actualiza al terminar cada trazo, sin retrasar el dibujo en una cuadrícula de 200 × 200.
- Muestra el total, el margen de seguridad aplicado y permite cambiar `marginPercent` y `carryAlways`, este último con una explicación de una línea.
- Deja claro que es una estimación. Si el perfil es aproximado, lo advierte y ofrece ir a calibrar.
- Usa las funciones de `src/core/yarn.ts`; no dupliques las fórmulas.

## Criterios de aceptación

- Los cuatro comandos de `AGENTS.md` terminan en verde.
- A 375 × 812, en el editor: no hay desplazamiento vertical de página, la cuadrícula ocupa al menos el 60 % del alto, y se puede cambiar de color y de herramienta sin desplazar nada.
- Un proyecto de 64 × 72 se abre mostrando la cuadrícula completa. Uno de 200 × 200 se abre sobre la fila 1.
- Centrar el diseño no cambia la posición de la cuadrícula en la pantalla.
- Crear un perfil con muestra de 20 puntos × 20 filas, 10 × 9 cm, y 2 m de hilo para 50 puntos da: 20 puntos y 22,2 filas en 10 cm, 4 cm de hilo por punto, y 80 × 89 para una pieza de 40 × 40 cm.
- Con ese perfil, un proyecto de 10 × 10 con las filas 1 a 5 en el color A y las filas 6 a 10 mitad A y mitad B, margen 10 % y `carryAlways` apagado, muestra 3,8 m de A y 1,6 m de B.
- No hay controles menores de 44 × 44 px ni errores en consola.
- Las partes B y C tienen pruebas de su lógica.

## Fuera de este encargo

Patrón escrito, exportación a PDF, modo tejer, importar imagen y PWA. No los empieces.
