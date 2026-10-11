# Encargo 2 — Proyectos y editor

Lee primero `AGENTS.md` y `docs/SPEC.md` (la sección 4 cambió en la regla de `carryAlways`).

## Objetivo

Que la usuaria pueda crear un proyecto con el tamaño que quiere, dibujar su diseño en el celular, centrarlo y encontrarlo guardado al volver. Corresponde a las pantallas 1, 2 y 3 de la especificación, sin el panel de hilo.

## Parte A — Correcciones de la fase 1

1. `src/core/yarn.ts`: con `carryAlways` encendido, un color de la paleta que no aparece en ninguna celda recibe hilo llevado y colas. Debe dar 0 m. Solo se llevan los colores usados en al menos una celda. Añade la prueba.
2. `src/core/yarn.ts`: `Math.ceil(totalCm / 10) / 10` puede subir una décima de más por error de coma flotante (por ejemplo, un total que debería ser exactamente 330 cm). Redondea de forma estable y añade una prueba con un caso que hoy falle.

## Parte B — Almacenamiento

- Guarda proyectos y perfiles en IndexedDB detrás de una interfaz pequeña (`list`, `get`, `save`, `remove`), de modo que la interfaz no conozca IndexedDB.
- Las celdas se guardan de forma compacta, no como un arreglo de números en JSON.
- Al abrir la app por primera vez se crean los dos perfiles de fábrica.
- Exportar un proyecto descarga un archivo `.json` con una versión de formato. Importar valida el archivo y rechaza, con un mensaje en español, lo que no sea válido, sin dañar los datos existentes.

## Parte C — Pantallas

**Proyectos.** Lista con nombre, tamaño en puntos y fecha de última edición. Crear, abrir, duplicar, borrar con confirmación, exportar e importar. Estado vacío que invite a crear el primero.

**Nuevo proyecto.** Nombre, perfil (de los existentes), plano o redondo, y tamaño en centímetros o directamente en puntos y filas. Muestra en vivo los puntos, las filas y el tamaño real resultante. Si el perfil es aproximado, lo advierte. Paleta inicial: fondo blanco y un color oscuro.

**Editor.**

- Cuadrícula en `<canvas>` con las celdas en la proporción real del punto según el perfil.
- Numeración de filas a ambos lados, con la fila 1 abajo, y de columnas arriba y abajo. Línea más marcada cada 5 y cada 10. Líneas de centro que se pueden mostrar u ocultar.
- Herramientas: pintar, borrar (pinta el fondo), rellenar zona, seleccionar un rectángulo y moverlo, centrar diseño, deshacer y rehacer.
- Un trazo completo es un solo paso de deshacer. Al menos 50 pasos.
- Centrar usa `centerDesign` y muestra su informe: puntos de fondo a cada lado, filas abajo y arriba, y el aviso cuando el centrado no puede ser exacto o el diseño no cabe.
- Paleta: añadir, renombrar, cambiar el color y borrar, con un máximo de 12. Al borrar un color, sus celdas pasan al fondo. El fondo no se puede borrar.
- Toque: un dedo usa la herramienta, dos dedos desplazan y hacen zoom. En PC: rueda para zoom y arrastre con botón central o barra espaciadora para desplazar.
- Guardado automático tras cada cambio, sin botón de guardar. Si el guardado falla, se avisa.
- Cambiar el tamaño del proyecto desde el editor conserva el diseño si cabe y, si no cabe, avisa antes de recortar.

La lógica del editor (historial de deshacer, relleno, mover selección, borrar color) va en funciones puras con pruebas, separada de los componentes.

## Criterios de aceptación

- Los cuatro comandos de `AGENTS.md` terminan en verde.
- Las dos correcciones de la parte A tienen pruebas que fallaban antes y pasan ahora.
- A 360 px de ancho: crear un proyecto de 40 × 40 cm, pintar, deshacer, rehacer, centrar, cerrar la pestaña, volver a abrir y encontrar el dibujo intacto. Sin desbordamiento horizontal ni errores en consola.
- Una cuadrícula de 200 × 200 se pinta, se desplaza y se amplía sin tirones perceptibles. Un trazo no debe copiar ni validar toda la cuadrícula por cada celda pintada.
- Todas las zonas de toque miden al menos 44 px.
- Exportar un proyecto e importarlo de nuevo produce un proyecto idéntico.
- Todo el texto visible está en español.

## Fuera de este encargo

Crear y calibrar perfiles, panel de hilo, patrón escrito, exportación a PDF, modo tejer, importar imagen y PWA. No los empieces.
