# Encargo 1 — Proyecto base y lógica

Lee primero `AGENTS.md` y `docs/SPEC.md`.

## Objetivo

Dejar el proyecto montado y toda la lógica de la sección 4 de la especificación implementada y probada. En esta fase no se construye interfaz, salvo una pantalla mínima que demuestre que la aplicación arranca.

## Tareas

1. Inicializa git en esta carpeta si no existe. Crea `.gitignore` con lo habitual de Node y Vite y, además, la línea `AGENTS.md`. Comprueba con `git status` que `AGENTS.md` no aparece como archivo a subir.
2. Monta el proyecto con Vite, React y TypeScript estricto en la raíz de esta carpeta, sin borrar `docs/` ni `AGENTS.md`. Configura Vitest y ESLint, y los scripts `dev`, `build`, `typecheck`, `lint` y `test`.
3. Define en `src/core/types.ts` los tipos `GaugeProfile` y `Project` según las secciones 3.1 y 3.2.
4. Implementa en `src/core/`, como funciones puras:
   - `gauge`: medidas del punto, y hilo por punto tejido y llevado, a partir de un perfil.
   - `sizing`: de centímetros a puntos y filas, con el tamaño real resultante.
   - `grid`: crear una cuadrícula, leer y escribir celdas, rectángulo envolvente del diseño, mover el diseño y centrarlo con el informe de márgenes que pide la especificación.
   - `yarn`: metros por color, con y sin `carryAlways`, colas y margen.
   - `pattern`: patrón escrito por filas para `flat` y `round`, con leyenda.
   - `defaults`: los dos perfiles de fábrica aproximados.
5. Deja `src/App.tsx` como una pantalla mínima en español con el nombre provisional de la app y un ejemplo calculado con un perfil de fábrica (puntos y filas para 40 × 40 cm), para comprobar que la lógica se puede usar desde la interfaz.
6. Escribe un `README.md` breve en español: qué es el proyecto y cómo ejecutarlo.

## Casos que las pruebas deben cubrir

- `sizing`: 40 × 40 cm con el perfil de 4 mm da 64 puntos × 72 filas. Un tamaño menor que un punto da 1 × 1.
- `grid`: centrar un diseño de 5 de ancho en 20 columnas deja 7 a la izquierda y 8 a la derecha y lo informa como no exacto. Un diseño de 6 en 20 deja 7 y 7. Un diseño que no cabe no se mueve y devuelve el aviso. Una cuadrícula sin diseño no falla.
- `yarn`: fila de un solo color no suma hilo llevado con `carryAlways` apagado y sí lo suma encendido. Fila con dos colores: cada color se lleva `cols - worked` puntos. Un color que no aparece en el proyecto da 0 m, sin colas. El margen se aplica al final. El resultado se redondea hacia arriba a un decimal.
- `pattern`: en `flat`, la fila 1 se lee de derecha a izquierda y la 2 de izquierda a derecha, comprobado con una cuadrícula asimétrica. En `round`, todas de derecha a izquierda y con la palabra "Vuelta". Tramos consecutivos del mismo color se agrupan. El total de cada fila coincide con `cols`.

## Criterios de aceptación

- `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` terminan sin errores.
- `npm run dev` abre la pantalla mínima sin errores en la consola.
- `src/core/` no importa nada de React ni usa APIs del navegador.
- `AGENTS.md` está ignorado por git; `docs/` sí está versionado.
- Hay al menos un commit con el trabajo. Sin `push`.

## Fuera de este encargo

Editor, almacenamiento, PWA, exportación a PDF, modo tejer e importación de imágenes. No los empieces.
