# Encargo 6 — Ejemplos, texto y espejo

Lee primero `AGENTS.md`, `docs/SPEC.md` y `DESIGN.md`. Rama: `encargo-06-ejemplos-texto-espejo`.

Este encargo añade funciones al editor. La interfaz ya tiene un diseño decidido: sigue `DESIGN.md` y la sección "Interfaz" de `AGENTS.md` al pie de la letra. Donde este encargo indica dónde va un control, ponlo ahí y no en otro sitio.

## Parte 0 — DESIGN.md fuera del repositorio

- Añade `DESIGN.md` a `.gitignore` y deja de versionarlo con `git rm --cached DESIGN.md`. El archivo debe seguir existiendo en la carpeta local.
- Comprueba con `git status` que ni `AGENTS.md` ni `DESIGN.md` aparecen como archivos a subir.

## Parte A — Botón "Más" en la barra de herramientas

La barra del editor no admite más botones a 375 px. Queda así, en este orden: Pintar, Borrar, Rellenar, Elegir, Deshacer, Rehacer, Más.

"Más" abre una hoja pequeña desde abajo (no un diálogo a pantalla completa) con estas acciones, cada una con su icono dibujado en el estilo de `Art.tsx`:

1. **Centrar el diseño** (sale de la barra y pasa aquí).
2. **Espejo** (parte C), con su estado encendido o apagado.
3. **Escribir texto** (parte B).
4. **Añadir una imagen** (sale del panel de Ajustes y pasa aquí; abre el mismo flujo de importación).

La hoja se cierra al elegir una acción, al tocar fuera y con Escape.

## Parte B — Escribir texto

Para poner un nombre o una fecha en una manta de bebé.

- Una fuente de píxeles propia de 5 de ancho por 7 de alto, definida en `src/core/`: A–Z, Ñ, vocales con tilde, Ü, dígitos, espacio y `. , - ! ? ♥`. Las minúsculas se escriben como mayúsculas. No copies una fuente ajena.
- Pantalla de una sola vista: el campo de texto, el color (de la paleta del proyecto) y el tamaño (Normal, Doble, Triple), con la vista previa del texto colocado sobre la pieza actualizándose al escribir.
- Debajo, una frase con lo que ocupa: "Mide 12 × 3 cm (42 puntos × 7 filas)". Si no cabe a lo ancho, lo dice y propone el tamaño menor o partirlo en dos líneas.
- Al aceptar, el texto queda centrado y seleccionado, listo para moverlo con la herramienta Elegir. Es un solo paso de "Deshacer".
- Un carácter que la fuente no tiene se omite y se avisa de cuál fue.

## Parte C — Espejo

Para dibujos simétricos como una mariposa.

- Con el espejo encendido, todo lo que se pinta o se borra en un lado se repite reflejado respecto al eje vertical del centro de la pieza. Rellenar no se refleja.
- Mientras está encendido, el eje se dibuja sobre la cuadrícula y el botón "Más" muestra una marca para que se note que sigue activo.
- Con un número impar de columnas, la columna central es el eje y no se duplica.
- Un trazo reflejado es un solo paso de "Deshacer".
- El espejo se apaga solo al cerrar el proyecto; no se guarda.

## Parte D — Diseños de ejemplo

Para que la app no empiece vacía y se pueda probar sin tener una imagen.

- Cuatro dibujos originales, pequeños (entre 16 y 28 puntos de lado) y de dos o tres colores: un corazón, una flor, una ovejita y una estrella. Definidos en `src/core/` de forma compacta y legible.
- En el inicio, debajo de las dos formas de empezar, una fila "O prueba con un ejemplo" con las cuatro miniaturas. Se desplaza en horizontal si no caben. Usa `ProjectThumb` para dibujarlas.
- Tocar una crea un proyecto de 30 × 30 cm con la muestra de aguja de 4 mm, el dibujo centrado y el nombre del ejemplo, y abre el editor.
- La fila se oculta cuando ya hay tres proyectos o más.

## Parte E — Comprobar las descargas

Descarga el PDF y el PNG de un proyecto importado desde una imagen y de uno con texto. Comprueba que se abren, que la leyenda usa los nombres de color del proyecto y que la cuadrícula coincide con el editor. Si algo falla, corrígelo; si todo está bien, dilo en el informe con lo que observaste.

## Lógica y pruebas

En `src/core/`, con pruebas:

- La fuente: cada carácter mide 5 × 7, ninguno está vacío salvo el espacio, y "ANA" con un punto de separación mide 17 × 7.
- Texto escalado al doble: cada punto pasa a ser un bloque de 2 × 2.
- Texto que no cabe: no se coloca y se devuelve el motivo.
- Espejo: pintar la columna 3 de una pieza de 20 pinta también la 18 (contando desde 1); en una pieza de 21, la columna 11 no se duplica.
- Ejemplos: cada uno respeta su tamaño, usa solo colores de su paleta y tiene fondo en todo su contorno.

## Criterios de aceptación

- Los cinco comandos terminan en verde.
- A 375 × 812: la barra de herramientas no se desplaza ni se corta; la hoja "Más" muestra las cuatro acciones; escribir "LUCÍA" en tamaño doble, aceptar y deshacer deja la pieza como estaba.
- Dibujar media mariposa con el espejo produce la otra mitad idéntica.
- Tocar el ejemplo de la ovejita abre el editor con el dibujo centrado.
- "Añadir una imagen" ya no aparece en Ajustes y funciona desde "Más".
- Lista de comprobación de `DESIGN.md` completada, con una captura a 375 × 812 de: el inicio con ejemplos, la hoja "Más", la pantalla de texto y el editor con el espejo encendido.
- Verificado también en la vista previa de Cloudflare de la rama.

## Fuera de este encargo

Cambios de colores, tipografía o estructura de las pantallas existentes más allá de lo indicado. Modo tejer, patrón y muestras no se tocan.
