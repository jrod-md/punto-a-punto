# Validación del encargo 3

Se leyó `AGENTS.md`, la especificación completa y `docs/encargos/03-muestra-e-hilo.md`. Se conservaron la especificación y el encargo; este último ya estaba en la carpeta al comenzar. No se añadieron dependencias.

## Editor en celular

- A 375 × 812, el editor ocupa el alto visible y el documento mide 375 × 812, con `scrollY = 0`. El canvas comienza a 60,8 px y mide 646,4 px de alto: 79,6 % de la pantalla.
- Paleta y herramientas permanecen visibles. Se cambió de herramienta y de color sin desplazar la página, incluyendo la selección del color 12 en la tira horizontal. Se eliminaron las barras nativas que reducían el espacio de la tira.
- El proyecto de 64 × 72 se abre completo. El de 200 × 200 se abre ampliado, centrado en horizontal y con la fila 1 visible abajo.
- Centrar mostró su informe sobrepuesto; el canvas mantuvo exactamente su posición y su alto antes y después.
- Las etiquetas se seleccionan según su tamaño real y la distancia a las demás. La prueba de 72 junto a 70 conserva 72 y omite 70 si se solapan. En la captura de vista completa no se superponen.
- A 812 × 375 se reajustó la vista completa; el canvas ocupa el 74 % del alto y no hay desplazamiento del documento. Las pruebas de vista ampliada comprueban que el punto del dibujo situado en el centro se conserva al cambiar las dimensiones o la proporción de la muestra.
- Ningún botón, entrada, selector o desplegable visible del editor y del panel de hilo mide menos de 44 × 44 px. Las leyendas pequeñas de los iconos pertenecen a botones de 44 × 44 px.

## Muestras e hilo

- El asistente rechazó campos vacíos con mensajes en español. Una muestra de 14 puntos mostró un aviso que permite continuar; las pruebas también cubren cero, negativos, infinitos, conteos fraccionarios y los límites de las medidas.
- Se creó y guardó en IndexedDB una muestra de 20 puntos × 20 filas, 10 × 9 cm y 2 m para 50 puntos. La interfaz mostró 20 puntos y 22,2 filas en 10 cm, 4 cm de hilo por punto y 80 puntos × 89 filas para 40 × 40 cm.
- Se duplicó la muestra y se canceló el borrado de su copia. El intento de borrar el perfil de 4 mm usado mostró los nombres de los tres proyectos que lo necesitaban.
- Se creó un proyecto de 10 × 10 con la muestra propia y se pintó la mitad derecha de las filas 6 a 10. Con las filas 1 a 5 de fondo, margen 10 % y `carryAlways` apagado, el panel mostró 3,8 m del fondo, 1,6 m del color oscuro y 5,4 m en total.
- Cambiar margen y activar hilo llevado recalculó los metros. Se restituyeron después margen 10 % y la opción apagada.
- Cambiar al perfil aproximado de 4 mm conservó los 10 × 10 puntos y el dibujo y mostró 6,25 × 5,56 cm. Volver al perfil propio restituyó 5 × 4,5 cm y explicó el recálculo.
- Después de calibrar se editaron los metros por ovillo a 2. El panel mostró 2 ovillos del fondo y 1 del color oscuro. Recargar conservó la muestra, el dibujo, el margen y esas cantidades.
- Desde una estimación aproximada se abrió el asistente de calibración y se volvió al editor conservando el proyecto.
- Una prueba aislada de fallo de guardado mostró el aviso también dentro del panel de ajustes abierto. La siguiente edición recuperó el estado guardado. La pestaña final y esa prueba no registraron advertencias ni errores en consola.

## Comprobaciones reproducibles y red local

- `scripts/storage-check.html`: 12 comprobaciones correctas, 0 fallidas. Incluye creación, edición, reapertura, duplicación y eliminación de muestras en una base aislada, además de los respaldos y errores de la fase 2. La base de prueba se eliminó al terminar.
- `scripts/canvas-check.html`: 9 comprobaciones correctas, 0 fallidas. En 120 movimientos no se leyó, copió ni validó toda la cuadrícula; el final confirmó una sola operación. También comprobó dos dedos, cancelación, botón central y rueda.
- En esa ejecución, el cálculo de hilo para 200 × 200 con 12 colores tuvo una mediana de 5,10 ms; `drawImage`, un máximo de 0,10 ms; los gestos sintéticos, una mediana de 5,50 ms por fotograma. Son mediciones de este equipo de desarrollo, no garantías para un teléfono.
- `npm run dev:phone -- --port 5188 --strictPort` inició Vite con `--host 0.0.0.0`. Una petición HTTP desde el PC a su dirección IPv4 de red obtuvo 200 y el documento de la aplicación. El navegador integrado no pudo completar la navegación a esa dirección, aunque la petición desde PowerShell sí pasó fuera de la restricción de red de la herramienta. No se modificó el firewall.
- Los identificadores se generan con `crypto.getRandomValues`. Una prueba verifica su funcionamiento sin `crypto.randomUUID`, que no se puede asumir disponible al abrir el servidor por HTTP en el celular.

## Decisiones no fijadas por la especificación

- Vista completa si ambas dimensiones de una celda alcanzan 3 px; en otro caso, apertura desde la fila 1 con celdas de al menos 12 px. La vista completa se reajusta al girar; la ampliada conserva su centro en coordenadas del dibujo.
- Paneles superpuestos con Escape, botón de cierre y recorrido de foco acotado. En horizontal, paleta y herramientas comparten una fila cuando hay espacio.
- El total de hilo suma los metros mostrados por color, ya redondeados hacia arriba. El margen se valida y aplica explícitamente; nunca se guarda un campo vacío o inválido.
- Renombrar una muestra de fábrica o añadir ovillos conserva su marca de aproximado. Cambiar sus medidas de muestra o de hilo la convierte en muestra propia. Duplicar conserva la marca original. Editar una muestra usada actualiza el cálculo de todos sus proyectos.
- Se establecieron límites amplios para rechazar entradas imposibles y evitar cálculos desbordados; se detallan en el README. Una muestra pequeña válida sigue siendo aceptada.
- El historial pertenece a la sesión del editor. Ir a la pantalla de muestras espera a que termine el guardado; volver abre una nueva sesión con el dibujo conservado.

## Comandos finales y límites

Los cuatro comandos de `AGENTS.md` se ejecutaron correctamente: TypeScript sin errores, ESLint sin errores ni advertencias, 147 pruebas de Vitest en 12 archivos y compilación de producción con 51 módulos.

No se implementaron patrón escrito, PDF, modo tejer, importación de imagen ni PWA. No quedan funciones del encargo a medio implementar. Falta la comprobación en un teléfono físico, incluido su acceso por wifi, teclado en pantalla y gestos reales; las comprobaciones de tamaño y giro se hicieron con el navegador integrado.
