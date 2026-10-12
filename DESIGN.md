# Diseño de Punto a punto

Guía de la interfaz. Cualquier cambio visual o de flujo debe seguirla. Si algo que necesitas no está aquí, amplía esta guía en el mismo cambio en vez de improvisar en un componente.

## Para quién

Una tejedora en el sofá, con el celular apoyado en la pierna y el ganchillo en la otra mano, que mira la pantalla a ratos bajo la luz cálida de casa. No usa apps de diseño. Tiene que entender cada pantalla sin leer instrucciones.

## Carácter

**Lana y jardín.** Tierna, cálida y artesanal: crema de lana, verde de jardín, terracota y rosa viejo, con una ovejita que acompaña. Moderna por limpia y espaciosa, no por fría.

No es: una herramienta técnica gris, un panel de administración, ni una app infantil recargada. La ternura está en pocos detalles bien puestos, no en adornar cada rincón.

## Principios de flujo

1. **Lo primero que se ve es el resultado, no un formulario.** La app decide sola lo que puede (recorte, cuadros, colores, fondo) y muestra el dibujo. Las correcciones se ofrecen después.
2. **Una sola vista previa por pantalla.** Si hacen falta dos miradas del mismo dibujo, se alterna con un conmutador; nunca dos cuadrículas a la vez.
3. **Una acción principal por pantalla**, verde, abajo y al alcance del pulgar. Lo demás es secundario o va plegado.
4. **Lo avanzado va plegado** en "Más opciones" o en un panel que se abre al tocar. Si la app no pudo decidir algo, abre sola el panel que hace falta.
5. **Pocos pasos.** Antes de añadir una pantalla o un paso, intenta resolverlo en la pantalla que ya existe.
6. **Palabras de tejedora.** Puntos, filas, cuadros, muestra, ovillo. Nada de píxeles, índices, JSON, rejilla, malla ni términos de programa. Las frases son cortas y dicen qué hacer.
7. **Nada se pierde sin avisar.** Borrar pide confirmación; lo demás se puede deshacer.

## Colores

Todos están definidos como variables al principio de `src/styles.css`. **No se escriben colores literales en ninguna regla ni en ningún componente**; se usa siempre la variable. La única excepción es el dibujo de la usuaria y el código que pinta en `<canvas>`, que usa los mismos valores.

| Variable                    | Valor                | Uso                                                             |
| --------------------------- | -------------------- | --------------------------------------------------------------- |
| `--paper`                   | `#faf5ec`            | Fondo de la app                                                 |
| `--paper-deep`              | `#f1e8d9`            | Zonas hundidas: escenario de la vista previa, paneles de ajuste |
| `--surface`                 | `#fffcf6`            | Tarjetas, botones secundarios, campos, barras                   |
| `--ink`                     | `#3a2f2a`            | Texto principal                                                 |
| `--ink-soft`                | `#6f6258`            | Texto secundario                                                |
| `--line`, `--line-strong`   | `#e6dccb`, `#d0c2ad` | Separadores y bordes                                            |
| `--garden`                  | `#4f7a5a`            | Acción principal y elemento seleccionado                        |
| `--garden-deep`             | `#3b6046`            | Sombra del botón principal, texto verde sobre claro             |
| `--garden-soft`             | `#dfead9`            | Fondo de selección suave, cabecera del inicio                   |
| `--clay`                    | `#c9694a`            | Acento: foco del teclado, ovillo, marcas sobre la cuadrícula    |
| `--rose`, `--rose-soft`     | `#e9b3a6`, `#f9e8e2` | Detalles de ilustración                                         |
| `--butter`, `--butter-soft` | `#f2d684`, `#fbf0cf` | Flores; fondo de los avisos                                     |
| `--danger`, `--danger-soft` | `#a43d2c`, `#f8e0d8` | Borrar y errores                                                |

Reglas:

- El verde es para **una** acción principal por pantalla y para lo que está seleccionado. No se usa de adorno.
- La terracota es acento; nunca fondo de botones con texto blanco (no alcanza el contraste).
- No hay negro puro ni blanco puro.
- No hay tema oscuro.

## Tipografía

Nunito variable, incluida en la app (`@fontsource-variable/nunito`, solo el subconjunto latino). Sin fuentes cargadas de internet.

| Uso                          | Tamaño                             | Peso |
| ---------------------------- | ---------------------------------- | ---- |
| Título de pantalla (`h1`)    | 1.75rem (1.4rem en flujos guiados) | 800  |
| Título de sección (`h2`)     | 1.15rem                            | 800  |
| Texto                        | 1rem                               | 500  |
| Botones y etiquetas de campo | 1rem / 0.9rem                      | 700  |
| Texto secundario (`.subtle`) | 0.85rem                            | 500  |
| Sobretítulo (`.eyebrow`)     | 0.78rem, mayúsculas                | 800  |

Los campos de texto nunca bajan de 16px, para que Safari no amplíe la página.

## Forma

- Radios: `--radius-s` 10px, `--radius` 14px (botones y campos), `--radius-l` 22px (tarjetas, paneles, escenario).
- Botón principal: verde con una sombra sólida de 2 a 3px debajo (`--shadow-press`) que desaparece al pulsar. Da sensación de botón que se hunde.
- Tarjetas: fondo `--surface`, sin borde, con `--shadow-card`. Nunca una tarjeta dentro de otra.
- **Puntada:** una línea discontinua interior (`.stitched`, o la que lleva `.stage`) que parece un pespunte. Se reserva para el escenario de la vista previa y, como mucho, un elemento destacado por pantalla.
- Zonas de toque de al menos 44 × 44px. Sin nada que dependa de pasar el cursor.

## Componentes que ya existen

Antes de crear uno nuevo, usa estos. Están en `src/styles.css` y `src/components/`.

| Componente          | Clase o archivo                            | Cuándo                                                |
| ------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Botón principal     | `button.primary`                           | La acción principal de la pantalla                    |
| Botón secundario    | `button`                                   | Acciones normales                                     |
| Botón discreto      | `button.quiet`                             | Volver, enlaces de pie de página                      |
| Botón de riesgo     | `button.danger`                            | Borrar                                                |
| Selector de archivo | `label.file-button`                        | Abrir una imagen o una copia guardada                 |
| Conmutador          | `.segmented` con `aria-pressed`            | Elegir entre 2 a 4 opciones excluyentes               |
| Aviso               | `.notice`                                  | Algo que conviene saber; no bloquea                   |
| Error               | `.error` con `role="alert"`                | Algo falló y hay que actuar                           |
| Escenario           | `.stage`                                   | La única vista previa de la pantalla                  |
| Barra de flujo      | `.flow-bar` + `.flow-step`                 | Cabecera de un flujo guiado: volver, título, "1 de 2" |
| Acción fija         | `.flow-actions`                            | La acción principal pegada abajo                      |
| Ajustes plegados    | `.adjust-tabs` + `.adjust-panel`           | Correcciones opcionales bajo el escenario             |
| Más opciones        | `details`                                  | Opciones avanzadas                                    |
| Tarjeta de lista    | `.project-list li`                         | Proyectos y muestras                                  |
| Pestañas del editor | `.editor-tabs`                             | Hilo, Patrón y Tejer                                  |
| Ilustraciones       | `Sheep`, `YarnBall`, `Meadow` en `Art.tsx` | Ver más abajo                                         |

## Ilustraciones

Dibujadas a mano en SVG dentro de `src/components/Art.tsx`, con las variables de color. Son decorativas (`aria-hidden`).

- **La ovejita** aparece en momentos, no en todas partes: la cabecera del inicio, la lista vacía (dormida) y mientras la app lee una imagen. Se puede añadir en una celebración (pieza terminada) o en un estado vacío nuevo.
- No se añaden emojis, iconos de librerías ni imágenes externas. Si hace falta un icono nuevo, se dibuja en el mismo estilo: trazo redondeado de 2.6 sobre una caja de 40.
- El único movimiento decorativo es el balanceo suave de la ovejita mientras se espera, y respeta `prefers-reduced-motion`.

## Movimiento

Transiciones de 100 a 200ms solo para indicar estado (pulsar, seleccionar). Sin animaciones de entrada ni rebotes.

## Antes de dar por terminado un cambio de interfaz

1. Míralo a 375 × 812 y a 1280 de ancho. Sin desplazamiento horizontal.
2. Ningún control mide menos de 44 × 44px.
3. No hay colores literales nuevos: `grep -nE "#[0-9a-fA-F]{3,8}" src/styles.css` solo debe encontrar la definición de variables.
4. La pantalla tiene una sola acción principal y una sola vista previa.
5. Los textos nuevos siguen el principio 6.
6. Las pantallas vecinas que comparten clases siguen viéndose bien (las listas de proyectos y de muestras comparten `.project-list`).
