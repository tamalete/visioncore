# Pruebas automáticas

Sin dependencias (Node 22 o superior). Las seis primeras cargan el `<script>` del visor en un `vm` con un DOM falso y usan el SheetJS de `vendor/`; la de navegador usa el Chrome, Chromium o Edge que haya en el equipo. Solo usan datos sintéticos de `ejemplo/`.

```
node pruebas/todo.js          # todo de una vez: sintaxis de cada <script> y las siete de abajo
node pruebas/correr.js        # cifras del ejemplo contra pruebas/esperado.json
node pruebas/unidad.js        # funciones puras: fechas, coordenadas, horas, catClave
node pruebas/casos.js         # una fila (o un pequeño libro) por regla: qué debe salir y qué no (falsos positivos)
node pruebas/presentacion.js  # hechos de columna de la pestaña del SiB (sibColumnas): la lógica, no el HTML
node pruebas/idavuelta.js     # Excel corregido -> «sí» en «Por decidir» -> recarga -> versión _v2, _v3
node pruebas/gbif.js          # importación de una descarga de GBIF: occurrence.txt y .zip DwC-A, campos mapeados y errores por fila
node pruebas/navegador.js     # en un navegador real y SIN RED: carga el ejemplo y recorre temas, revisión, ficha, celular e informe
```

## En un navegador real (`navegador.js`)

Abre el visor en Chrome, Chromium o Edge sin ventana (por el protocolo de DevTools, con el `WebSocket` de Node) y **sin red**:
el visor tiene que funcionar sin conexión. Las librerías salen de `vendor/` aunque el HTML apunte a un CDN. En escritorio
(1400×900) y en celular (390×844) carga el ejemplo y abre la revisión (sus tres pestañas), la ficha, el panel del celular,
los cuatro temas y el informe para imprimir. Falla si salta cualquier error de JavaScript. Si no hay navegador, se omite
(`CHROME=/ruta` para indicar uno).

Con dos archivos compara además **el estilo calculado de cada elemento** (unos 40.000: cada estado, cada tema, los dos
tamaños y la vista de impresión) y dice qué propiedad cambió y dónde. Sirve para reordenar el CSS sin cambiar nada:

```
node pruebas/navegador.js antes.html despues.html
```

No mira `:hover` ni `:focus`. Dentro del mapa ignora la posición (`transform`) y los marcadores que una de las dos páginas
todavía no dibujó: dependen del mapa, no del CSS.

Contra otro archivo del visor (por ejemplo un borrador del taller, desde `repositorio/`):

```
node pruebas/todo.js ../versiones/visioncore/visioncore_vNN_borrador.html
```

Cada prueba suelta acepta la misma ruta.

Todas terminan con código 1 si algo cambia, y dicen qué cifra o caso cambió. Si el script del visor no arranca (un error al cargarlo), fallan de una vez; antes solo avisaban y seguían.

## Antes de cada commit

`.githooks/pre-commit` corre `todo.js` contra el `index.html` que va en el commit, cuando el commit toca `index.html`, `pruebas/`, `ejemplo/` o `vendor/`. Si algo falla, el commit no se hace. Se activa una vez en cada copia del repositorio con `git config core.hooksPath .githooks`. La acción de GitHub corre lo mismo después de cada push.

## Regla

Si una cifra cambia, se explica en `CHANGELOG.md` o en la nota de la versión **antes** de actualizar `esperado.json` (`node pruebas/correr.js --actualizar`). Una cifra que se mueve sin explicación es un posible error.

En `unidad.js`, un caso con `pendiente` es un fallo conocido: se informa, pero no hace fallar la corrida. Cuando se arregla, se quita la marca.

Un caso con `si:'expresión'` solo corre si esa expresión da verdadero en el visor cargado (por ejemplo, `typeof avisoMunicipio==="function"`): así los casos de una función nueva se omiten, y se cuentan aparte, contra versiones que aún no la tienen.

## Casos por regla (`casos.js`)

Arma en memoria, con el SheetJS del visor (ayudas en `sintetico.js`), un libro sintético por caso y lo pasa por `parseWorkbook` y `unirFuentes` como `correr.js`. Las especies son reales y comunes en Colombia; las coordenadas, los catálogos y las personas («Equipo de ejemplo») son inventados. Cada caso dice qué tipo de hallazgo **debe** salir (`tipo`), cuáles **no** (`no`: falsos positivos), en qué filas (`en`) y, si hace falta, qué sugerencia debe traer (`ver`). Al final imprime cuántos tipos propios de `QC_TYPES` quedaron cubiertos y cuáles no.

- No cubre `nom_*` (verificación de nombres contra GBIF y Catalogue of Life, necesita red) ni las banderas `ag_*` (las pone GBIF en la columna `issue`).
- Para agregar una regla: una línea `c('texto','tipo',[{cambios sobre la fila de base}],{no:[...]})` en `casos.js`, y otra con el caso contrario (un dato bien escrito que no debe saltar). Los libros de varias filas (repetidos, series de catálogo, punto compartido) y los que necesitan 20 filas o más (`al_valor_suelto`, `al_campo_repetido`) se arman con `c(..., [filas])` o con `lote(id,tipo,n,i=>cambios)`.
- Un caso solo corre si todos los tipos que nombra existen en el visor cargado; si no, se cuenta aparte como omitido. Con `si:'expresión'` se puede exigir además una función.

## Presentación y ida y vuelta (`presentacion.js`, `idavuelta.js`)

Las dos se omiten solas contra un visor que no tiene `sibColumnas` (hechos de columna) o `leerPorDecidir` (hoja «Por decidir»), o sea la 0.36.0.

- `presentacion.js` comprueba que los hechos de columna del ejemplo se agrupan (8 columnas, listos 14 de 14), los umbrales (90 %, mínimo 5 registros, un solo valor), que lo agrupado más lo suelto cuadra con el total y que `r.sib` no cambia. No mira el HTML de la tarjeta o la tabla.
- `idavuelta.js` reemplaza `XLSX.writeFile` para atrapar el libro, lo guarda y lo vuelve a abrir en memoria (así viajan los comentarios), y revisa hojas, comentarios, columnas `verbatim*`, «Por decidir», la recarga con «sí», el nombre `_v2` / `_v3` y los motivos de lo que no se puede aplicar. Incluye una celda cambiada a mano antes de recargar y un libro sintético con coordenadas en columnas `verbatim*`. Con datos reales (UPTC, Güepsa) no se corre aquí: eso se hace a mano en el taller.

## Descarga de GBIF (`gbif.js`)

Prueba la importación de una descarga de GBIF por el mismo camino que el botón de abrir archivo (`abrirLibro` -> `parseWorkbook` -> `unirFuentes`). Usa `ejemplo/gbif_occurrence_ejemplo.txt`: 8 registros inventados (especies reales de anfibios y reptiles de Colombia; gbifID, catálogos, localidades y personas ficticios) con columnas de una descarga simple de GBIF (`gbifID`, `datasetKey`, `decimalLatitude`, `scientificName`, `issue`…).

- **TSV (`occurrence.txt`)**: se reconoce como descarga de GBIF, entran 8 registros, se mapean `gbifID`, `scientificName`, `decimalLatitude/Longitude`, `catalogNumber`, `occurrenceID`, `family` y la fecha, y los registros salen marcados como de GBIF.
- **Errores por fila**: `clase_incongruente` (Rhinella marina con `class = Reptilia`) y nada más en esa fila; `coord_fuera_rango` (latitud 95,5); `sin_coordenadas`; las banderas de la columna `issue` salen como alertas `ag_*`; dos filas sanas no sacan ningún hallazgo.
- **DwC-A (`.zip`)**: la prueba arma en memoria un zip sin compresión con `meta.xml`, `occurrence.txt`, `verbatim.txt` y el EML de un conjunto (`dataset/<datasetKey>.xml`). Comprueba que lee `occurrence.txt` y no `verbatim.txt`, que da los mismos registros y hallazgos que el TSV, que el título del conjunto sale del EML y que un zip sin `occurrence.txt` se rechaza con un mensaje claro.
- No cubre la verificación de nombres contra GBIF (red) ni zips comprimidos con deflate (el navegador los abre con `DecompressionStream`, que el DOM falso no tiene). Se omite sola contra un visor sin `abrirLibro`.
- Para cambiar el ejemplo hay que ajustar a la vez los números de fila de `gbif.js`.
