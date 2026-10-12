# Encargo 5b — Correcciones del PR 2

Lee primero `AGENTS.md`. Trabaja en la misma rama `encargo-05-importar-imagen` y sube los commits al PR 2 existente. No abras otro PR.

## Qué falló

Se probó `detectMesh` con las dos capturas reales que envió la usuaria (no están en el repositorio y no deben subirse; son patrones de terceros).

| Imagen                                         | Tamaño        | Cuadro real     | Resultado                                               |
| ---------------------------------------------- | ------------- | --------------- | ------------------------------------------------------- |
| Polilla, cuadros cuadrados                     | 330 × 173 px  | 6 × 6 px        | Correcto: 55 × 29, dibujo reconocible                   |
| Gato, cuadros rectangulares                    | 204 × 293 px  | ≈ 5,1 × 8,2 px  | `null`: se trata como foto                              |
| El mismo gato ampliado ×4 con suavizado        | 816 × 1172 px | ≈ 20,4 × 32,8 px | Incorrecto: 163 × 233 cuadros de 5 px, dado por bueno   |

El gato es la imagen que ella calificó de "fácil". Falla por dos motivos:

1. `detectMesh` descarta cualquier combinación en la que un eje mida más de 1,35 veces el otro. Muchos patrones de crochet y de punto se dibujan con cuadros rectangulares, justamente para imitar la proporción del punto, así que no son un caso raro.
2. Cuando la detección se equivoca, devuelve una malla absurda con total seguridad en lugar de reconocer que no sabe.

## Lo que se pide

1. **Cuadros rectangulares.** El periodo de cada eje se detecta de forma independiente. Admite proporciones entre 1:2,5 y 2,5:1. La protección contra detectar el doble del tamaño real debe seguir funcionando en cada eje por separado.
2. **Saber cuándo no sabe.** Una malla solo se acepta si su periodo coincide con una periodicidad real y clara en ambos ejes. Si no, la app no propone números inventados: muestra la imagen recortada y pide "¿Cuántos cuadros tiene de ancho?" y "¿Cuántos de alto?", con la rejilla en vivo. El camino de foto solo se ofrece si la usuaria lo elige o si la imagen claramente no tiene cuadros.
3. **Ayuda al corregir.** Si la usuaria corrige uno de los dos números, la app vuelve a buscar el otro eje con esa pista en vez de dejarlo como estaba.
4. **Imágenes pequeñas.** Si los cuadros miden menos de unos 6 px, la app avisa de que la imagen es muy pequeña para leerla con seguridad y sugiere usar la imagen original en vez de una captura de pantalla del chat. Aun así lo intenta.
5. **Vista de comprobación.** En el paso de cuadros, además de la rejilla sobre la imagen, muestra al lado el dibujo tal como se está leyendo, para que un error se vea antes de continuar.

## Pruebas nuevas

Generadas en la propia prueba, sin imágenes externas:

- Dibujo de 40 × 36 cuadros con cuadros de 10 × 16 px y líneas de cuadrícula de 1 px: idéntico.
- El mismo con cuadros de 16 × 10 px: idéntico.
- El mismo dibujo generado a 20 × 32 px por cuadro y reducido con promedio de área hasta 5,1 × 8,2 px por cuadro, con números en los bordes recortados: se recuperan 40 × 36, y como mucho un 3 % de cuadros difiere.
- Esa imagen pequeña ampliada ×4 con suavizado: 40 × 36, nunca una malla con cuadros de menos de un tercio del tamaño real.
- Una imagen con periodicidad clara en un eje y ninguna en el otro: no devuelve malla; pide los números.
- Corregir las columnas a 40 en una imagen cuya detección falló: las filas se recalculan a 36.
- Todas las pruebas anteriores de cuadros cuadrados siguen pasando.

## Criterios de aceptación

- Los cinco comandos terminan en verde.
- En la vista previa de Cloudflare, a 375 × 812, el recorrido con una captura generada de cuadros rectangulares termina con el dibujo correcto sin corregir los números a mano.
- Con una imagen dudosa, la app pregunta en lugar de proponer una malla equivocada.
- No se añade nada fuera de estos puntos.
