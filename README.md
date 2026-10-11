# Punto a punto

Base de una herramienta de tapestry crochet para calcular tamaños, centrar diseños, estimar hilo y generar patrones escritos. El nombre es provisional. Esta fase contiene la lógica pura de `src/core/`, sus pruebas y una pantalla mínima de ejemplo; no incluye editor ni almacenamiento.

## Ejecutar

Necesitas Node.js 22.12 o superior y npm.

```powershell
npm ci
npm run dev
```

Abre la dirección local indicada por Vite. La pantalla muestra el cálculo de 40 × 40 cm con el perfil aproximado de aguja de 4 mm: 64 puntos × 72 filas. No usa servicios externos ni envía datos del tejido a servidores.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

La compilación queda en `dist/`. `npm test` ejecuta Vitest una sola vez, sin modo de espera.

## Convenciones de la base

- `GaugeProfile` y `Project` incluyen `id` para relacionar los datos. La paleta admite de 1 a 12 colores.
- `cells` es una lista de índices de la paleta, de izquierda a derecha y desde la fila de abajo. Las funciones de cuadrícula usan coordenadas desde cero; las filas del patrón y el progreso empiezan en uno.
- Las operaciones devuelven nuevos datos. `centerDesign` y `moveDesign` admiten una cuadrícula de destino opcional para comprobar si el diseño cabe; si no cabe, devuelven el original y un aviso sin recortar celdas. Sin diseño, los márgenes son `null`.
- `carryAlways` lleva todos los colores de la paleta del proyecto, incluso en filas de un solo color. Con esa opción apagada, un color sin puntos tejidos no recibe consumo ni colas. Consultar un identificador ajeno a la paleta siempre devuelve 0 m.
- El hilo se devuelve como estimación: centímetros con colas y margen, metros redondeados hacia arriba a un decimal y, si se conocen los metros por ovillo, cantidad entera de ovillos redondeada hacia arriba desde el consumo sin redondear.
- Los perfiles de fábrica se copian para editarlos. Su calibración representa 100 puntos a 2,6 o 3,8 cm por punto; son estimaciones, no muestras de la usuaria.
- Los valores negativos, no finitos, divisores nulos y cuadrículas mal formadas producen errores en español. Un tamaño objetivo de cero se limita a una celda, como indica la fórmula.

Vite, React, TypeScript, Vitest y ESLint implementan las herramientas solicitadas; los paquetes de tipos y complementos incluidos permiten usarlas juntas. No se agregan bibliotecas de producto.
