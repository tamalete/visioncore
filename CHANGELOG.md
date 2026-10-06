# Registro de cambios

El proyecto se desarrolló como versiones numeradas de un archivo HTML antes de existir como repositorio; esta es la historia resumida. El repositorio arrancó en 0.23.0 porque la versión interna vigente era la v23; la numeración sigue la interna (v30 = 0.30.0). Las versiones intermedias no se publicaron una por una.

## 0.32.0 — 6 de octubre de 2026

- **Más grupos**: además de anfibios y reptiles, peces, aves, mamíferos, insectos, otros artrópodos, moluscos, plantas y hongos, cada uno con su silueta y color en el mapa, la leyenda y la lista. El grupo sale de la familia (anfibios, reptiles y peces tienen tabla de familias), del orden, de la clase, del filo o del reino. Las distintas clases de peces que usan las autoridades (Actinopteri, Actinopterygii, Chondrichthyes, Elasmobranchii, Dipneusti…) se aceptan sin marcarse como incongruentes. La familia solo se juzga en los grupos con tabla.
- **Pantalla de carga** con el archivo, su tamaño, la fase y una barra de avance; la animación sigue moviéndose mientras el navegador abre un Excel grande y muestra la silueta del grupo que trae el archivo. También al verificar nombres (con botón Cancelar; lo ya consultado se conserva y se puede continuar) y al exportar.
- **Coordenada contra el país y el departamento**: caer fuera de Colombia ya no es error si el registro dice otro país (canjes, donaciones). Sí se marca cuando la coordenada no cae en el país del registro (`country`, `countryCode` o el nombre del país en la localidad) o, en Colombia, en su departamento, y se propone la corrección de signo o de ejes que la haría caer ahí. Cajas aproximadas con margen de 0,5°.
- **Encabezados mal escritos**: `minimunElevationMeters`, `lifeSatege` y parecidos se leen como el término Darwin Core correcto, con un solo aviso por archivo para corregirlos antes de publicar.
- **Horas**: `eventTime` con una fecha (`1899-12-31`, la fecha cero de Excel) se marca como hora perdida, en la capa de campos sin dato (no como error: es común en colecciones históricas). "9 am", "9:30 pm" o "21h" se leen y se propone escribirlas como HH:MM:SS.
- Falsos positivos quitados: subgénero entre paréntesis ("Poecilia (Allopoecilia) caucana") ya no se toma como autoría ni descuadra el epíteto; sexo o etapa con varios valores en un lote ("Macho, Hembra") propone el separador " | ".
- Rendimiento con archivos grandes (prueba con 30.000 registros): la lista pinta 200 ejemplares por grupo con un botón "ver más" (de 2,5 s a menos de 0,1 s por filtro) y los puntos entran al mapa de una vez.
- Quitar una fuente actualiza el mensaje de carga; sin datos, la leyenda muestra todos los grupos.
- Con los Excel de la UPTC: 4.315 registros, 1.150 con al menos un error (antes 1.087: los 63 nuevos son coordenadas que no caen en el departamento del registro, entre ellas latitudes sin signo menos), 8.736 hallazgos.

## 0.31.0 — 4 de octubre de 2026

- **Filtros**: al tocar un hallazgo, la lista y el mapa muestran solo esos registros, y el aviso del mapa trae "exportar estos" (Darwin Core .xlsx solo con lo filtrado). **Línea de tiempo** por año, lustro o década: un clic filtra por ese periodo; con Mayúsculas el periodo se extiende.
- **Agrupar** también por especie aceptada y por conjunto de datos. Los títulos de los conjuntos de datos se leen de la carpeta `dataset/` del .zip de GBIF.
- **Alertas de GBIF**, pestaña propia que no cuenta como error: las banderas de la columna `issue` (traducidas y clasificadas en alta, media e informativa), posibles registros repetidos (misma especie, día y punto) y registros que dicen ser una observación aunque el ejemplar se colectó.
- **Excel con correcciones aplicadas**: Darwin Core .xlsx con las correcciones seguras ya escritas y una hoja "Cambios" con cada celda modificada. No toca identificadores ni nada que dependa de juicio.
- **Generalizar coordenadas de especies amenazadas** al exportar (opcional, 0,1°), con `dataGeneralizations` e `informationWithheld`.
- Nuevos hallazgos: coordenada sin punto decimal aunque el visor haya tomado la coordenada de otra columna (antes se reparaba en silencio); número de catálogo escrito de varias formas dentro de una serie (capa del SiB); la misma persona escrita de varias formas en `recordedBy` / `identifiedBy` (no cuenta como error). Para el catálogo repetido, "MUS-Am-0042" y "MUS- Am-42" son el mismo.
- Avance visible al cargar archivos grandes, sin frenarse si la pestaña queda en segundo plano; las tandas de archivos esperan su turno en vez de mezclarse.
- Arreglos: un año solo escrito como número (2011) ya no se lee como fecha de Excel (1905-07-03); "Scinax X-signatus" se reconoce como un problema de mayúsculas y no como nombre inexistente; ya no se propone "Chordata" cuando el catálogo solo reconoce un rango superior; una celda que diga "constructor" o "__proto__" ya no tumba la carga; "NA" cuenta como campo vacío; la altitud "2.820" se lee como 2.820 m; los colores de las fuentes no se repiten; el aviso de filtro y los límites del mapa se actualizan con cada cambio.
- Rendimiento: la lista se pinta unas cuatro veces más rápido y la búsqueda unas tres veces más rápido con miles de registros.
- Con los Excel de la UPTC: 4.315 registros, 3.941 con coordenada confiable, 1.087 con al menos un error (antes 1.010: los 77 nuevos son coordenadas guardadas sin punto decimal, que antes se reparaban sin avisar), 8.601 hallazgos entre errores y campos vacíos.

## 0.30.0 — 4 de octubre de 2026

- Revisión sobre una descarga real de GBIF (Darwin Core Archive, 3.647 registros de *Dendropsophus*): de 592 registros con error en la v29 se pasó a 9, y los que quedan son reales. Se quitaron falsos positivos:
  - **Género**: si GBIF marca el nombre como sinónimo, el género se compara con el nombre aceptado, que es el que GBIF usa para llenar `genus` y `family`. La ficha muestra el nombre aceptado.
  - **Duplicados**: solo cuenta el mismo número de catálogo dentro de la misma institución, colección y conjunto de datos; si no hay catálogo, se compara `occurrenceID`. Ya no se comparan números de campo ni catálogos de museos distintos.
  - **Fechas**: "-- --- ----", "0 0 0" y "[no verbatim date data]" cuentan como campo vacío; se leen "2-Mar-71" y "June 1943 - July 1944".
  - **Altitud**: "10000 ft" se convierte a metros y se conserva el valor original.
- En una descarga de GBIF, la pestaña "Para publicar en el SiB" explica que esos valores ya fueron reescritos por GBIF en vez de contar requisitos que no aplican.
- Con los Excel de la UPTC las cifras no cambian (4.315 registros, 3.941 con coordenada confiable, 1.010 con al menos un error, 8.515 hallazgos).

## 0.29.0 — 3 de octubre de 2026

- **Importación de GBIF y de archivos de texto**: acepta `.txt`, `.csv` y `.tsv` (UTF-8, Windows-1252 y UTF-16; separador tabulador, coma o punto y coma) y el `.zip` de una descarga de GBIF (Darwin Core Archive: lee `occurrence.txt`; o descarga simple), descomprimido en el navegador sin librerías nuevas. Si no hay número de catálogo, el registro se identifica por su `gbifID`.
- **Verificación de nombres** contra el Catalogue of Life a través de GBIF, solo si la persona pulsa el botón. Envía únicamente los nombres científicos distintos (sin autoría): ningún registro, localidad, coordenada ni persona. Marca nombres mal escritos, sinónimos, nombres no reconocidos, familias distintas a la del catálogo, nombres de otro grupo y especies en categoría VU, EN o CR de la UICN. Es la única función que usa internet con los datos.
- Vuelve la interfaz oscura de la v26, con todo lo de las versiones 27 y 28.
- Teselas del mapa: Esri y OpenTopoMap; OpenStreetMap ya no se usa como proveedor de teselas.

## 0.28.0 — sin versión publicada por separado

La v28 interna no se conserva como archivo. Sus cambios llegaron en 0.29.0: verificación de nombres, cuatro exportaciones completas (Darwin Core .xlsx y .csv con todas las columnas originales, GeoJSON y correcciones) y el ajuste de la regla de los *Anolis* (familia Anolidae).

## 0.27.0 — 25 de septiembre de 2026

- **Capa "Para publicar en el SiB"**, tercera pestaña de la revisión, según el manual de la plantilla del SiB v4.0: elementos obligatorios según el origen de los datos, vocabularios controlados, coherencia entre `basisOfRecord` y `type`, formato de `institutionCode`, `occurrenceID` y fechas, nombres con cf., aff., sp. o autoría, y listas de personas mal separadas. Propone el valor donde el manual da la receta.
- Nueva regla: `eventDate` no coincide con `year`/`month`/`day`.
- Vocabularios corregidos según el manual (sexo: Hembra, Macho, Hermafrodita, Desconocido; etapa: Huevo, Larva); los años solos dejan de marcarse como error; "sp2 Nov." ya no cuenta como epíteto distinto; los `catalogNumber` repetidos se tratan como posible lote.
- **Seguridad**: una celda de altitud sin números se insertaba sin escapar; ahora todo lo que viene del archivo se muestra como texto.
- La exportación Darwin Core (.xlsx y .csv) conserva todas las columnas y valores originales; lo que calcula el visor va en una hoja aparte.
- Se arreglan las horas leídas como "1899-12-30", las fechas inventadas ("-01-01" a años solos), los ejemplares sin nombre científico que se descartaban, el corrimiento de fechas por huso horario y la lectura de más formatos de fecha.
- Arrastrar y soltar el archivo, manejo con teclado y números con punto de miles.
- Interfaz rediseñada ("colección de museo"); esa apariencia se sustituyó en 0.29.0.

## 0.26.0 — septiembre de 2026

- Paneles del mapa que se pueden mover y ocultar en escritorio; botón de capas.
- La ficha agrupa los campos secundarios en un bloque desplegable.
- La búsqueda encuentra códigos escritos de varias formas (`ABC-Re-0012`, `ABC Re 0012`).

## 0.25.0 — 21 de septiembre de 2026

- La capa de calles pasa de OpenStreetMap a Esri World Street Map, porque los servidores de OpenStreetMap bloquean las páginas abiertas con doble clic.
- El mapa tiene límites de zoom y un botón para volver a los datos.

## 0.24.0 — 21 de septiembre de 2026

- Pensada para abrirse desde el celular: el panel pasa a ser una hoja inferior, el panel de capas arranca cerrado, el mapa ocupa la pantalla completa y se respetan las zonas seguras de las pantallas.
- CSV, GeoJSON e informe quedan deshabilitados cuando no hay registros.
- El lector y las reglas no cambiaron.

## 0.23.0 — 20 de septiembre de 2026

- Librerías empaquetadas en `vendor/`: el visor ya no depende de ningún CDN y funciona sin conexión.
- La hoja del libro de Excel se escoge por contenido y no por nombre; avisa si el archivo trae otra hoja con datos.
- La detección de archivos repetidos usa un hash del contenido, no el nombre del archivo.
- Las exportaciones CSV neutralizan valores que Excel podría ejecutar como fórmula.
- Vocabularios de sexo y etapa de vida reconocen sinónimos en inglés.
- Arreglada la fila del archivo de ejemplo que corría columnas y producía hallazgos falsos.

## 0.22.0 — 20 de septiembre de 2026

- **Pantalla de revisión**: al cargar un archivo se explica cada problema encontrado con qué pasó, por qué importa, cómo se arregla y ejemplos "dice / debería decir", con descarga de un CSV de correcciones sugeridas.
- Se retiraron los registros reales que venían incrustados en el archivo; ahora arranca vacío y trae 14 registros de ejemplo inventados.
- Mensajes claros cuando un archivo no deja ningún registro, en vez de un "listo" falso.
- El GeoJSON exportado marca las coordenadas no confiables.

## 0.21.0 — 15 de septiembre de 2026

- Capa base oscura sin llave de API (Esri Dark Gray).
- Coordenadas: se marcan como dudosas las imposibles y no se dibujan por defecto; lectura de más formatos y detección de latitud/longitud intercambiadas.
- Lectura de columnas que antes se ignoraban (coordenadas originales, municipio, identificador, hábitat, método) y recuperación de encabezados pisados por las etiquetas en español.
- Panel de síntesis y salto al ejemplar desde la lista.

## Antes de 0.21.0

Versiones 1 a 20: mapa con fichas tipo voucher, carga de varios archivos, conversión de coordenadas en grados-minutos-segundos, validación de clase contra familia, modos de color por grupo, altitud y hora, exportación a CSV y GeoJSON.
