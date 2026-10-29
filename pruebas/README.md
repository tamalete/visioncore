# Pruebas automáticas

Corren sin navegador y sin dependencias (solo Node 18 o superior). Cargan el `<script>` del visor en un `vm` con un DOM falso y usan el SheetJS de `vendor/`. Solo usan datos sintéticos de `ejemplo/`.

```
node pruebas/todo.js          # todo de una vez: sintaxis de cada <script> y las cinco de abajo
node pruebas/correr.js        # cifras del ejemplo contra pruebas/esperado.json
node pruebas/unidad.js        # funciones puras: fechas, coordenadas, horas, catClave
node pruebas/casos.js         # una fila (o un pequeño libro) por regla: qué debe salir y qué no (falsos positivos)
node pruebas/presentacion.js  # hechos de columna de la pestaña del SiB (sibColumnas): la lógica, no el HTML
node pruebas/idavuelta.js     # Excel corregido -> «sí» en «Por decidir» -> recarga -> versión _v2, _v3
```

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
